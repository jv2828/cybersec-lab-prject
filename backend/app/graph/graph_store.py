import networkx as nx
from typing import Dict, Any, List, Optional

class GraphStore:
    """
    In-memory graph store backed by NetworkX providing high-performance
    pathfinding, ego-network clustering, and community detection for the investigation UI.
    """

    def __init__(self):
        self.graph = nx.MultiDiGraph()

    def clear(self):
        self.graph.clear()

    def add_node(self, node_id: str, label: str, node_type: str, risk_score: int = 50, properties: Dict[str, Any] = None):
        self.graph.add_node(
            str(node_id),
            label=label,
            type=node_type,
            risk_score=risk_score,
            properties=properties or {}
        )

    def add_edge(self, source_id: str, target_id: str, edge_type: str, confidence: int = 90, properties: Dict[str, Any] = None):
        self.graph.add_edge(
            str(source_id),
            str(target_id),
            type=edge_type,
            confidence=confidence,
            properties=properties or {}
        )

    def populate_from_db(self, db):
        """Loads entities and relationships directly from the database into the NetworkX graph."""
        from backend.app.models.models import (
            Actor, Handle, Marketplace, PGPKey, Wallet, RealWorldEntity,
            HiddenService, ClearnetHost, OriginCandidate, TrustEdge
        )

        self.clear()

        # Marketplaces
        for m in db.query(Marketplace).all():
            self.add_node(m.id, m.name, "MARKETPLACE", risk_score=75, properties={"category": m.category})

        # Clearnet Hosts
        for c in db.query(ClearnetHost).all():
            self.add_node(c.id, f"{c.ip_address} ({c.hostname or 'host'})", "CLEARNET_IP", risk_score=80, properties={"asn": c.asn, "country": c.country_code})

        # Hidden Services
        for h in db.query(HiddenService).all():
            self.add_node(h.id, h.name, "ONION", risk_score=h.risk_score, properties={"onion": h.onion_address})
            if h.marketplace_id:
                self.add_edge(h.marketplace_id, h.id, "HOSTS_SERVICE", confidence=95)

        # Origin candidates
        for oc in db.query(OriginCandidate).all():
            self.add_edge(oc.service_id, oc.clearnet_host_id, "ORIGIN_MATCH", confidence=oc.confidence_score)

        # Actors
        for a in db.query(Actor).all():
            self.add_node(a.id, a.primary_handle, "ACTOR", risk_score=a.risk_score, properties={"category": a.category, "tz": a.activity_timezone})

        # Handles
        for h in db.query(Handle).all():
            self.add_node(h.id, f"@{h.handle_name}", "HANDLE", risk_score=h.actor.risk_score if h.actor else 50, properties={"marketplace": h.marketplace_id})
            self.add_edge(h.actor_id, h.id, "RESOLVED_PERSONA", confidence=95)
            self.add_edge(h.id, h.marketplace_id, "LISTED_ON", confidence=99)
            if h.pgp_fingerprint:
                pgp_id = f"pgp_{h.actor_id}"
                self.add_edge(h.id, pgp_id, "SIGNS_WITH_PGP", confidence=95)

        # PGP Keys
        for p in db.query(PGPKey).all():
            self.add_node(p.id, f"PGP: {p.fingerprint[-16:]}", "PGP", risk_score=40, properties={"fingerprint": p.fingerprint})

        # Wallets
        for w in db.query(Wallet).all():
            self.add_node(w.id, f"{w.currency}: {w.address[:10]}...", "WALLET", risk_score=75, properties={"address": w.address})
            if w.actor_id:
                self.add_edge(w.actor_id, w.id, "CONTROLS_WALLET", confidence=92)

        # Real World Entities
        for r in db.query(RealWorldEntity).all():
            self.add_node(r.id, f"Ident: {r.name_or_alias}", "REAL_WORLD", risk_score=90, properties={"type": r.entity_type, "country": r.country})
            self.add_edge(r.actor_id, r.id, "ATTRIBUTED_TO", confidence=r.confidence_score)

        # Trust Edges
        for t in db.query(TrustEdge).all():
            self.add_edge(t.source_handle_id, t.target_handle_id, "TRUST_EDGE", confidence=t.confidence)

    def get_full_graph_json(self, max_nodes: int = 400) -> Dict[str, Any]:
        """Returns nodes and edges formatted for Cytoscape.js visualization."""
        nodes = []
        edges = []
        
        selected_nodes = list(self.graph.nodes())[:max_nodes]
        sub = self.graph.subgraph(selected_nodes)

        for n, data in sub.nodes(data=True):
            nodes.append({
                "id": str(n),
                "label": data.get("label", str(n)),
                "type": data.get("type", "UNKNOWN"),
                "risk_score": data.get("risk_score", 50),
                "properties": data.get("properties", {})
            })

        for u, v, k, data in sub.edges(data=True, keys=True):
            edges.append({
                "id": f"{u}->{v}:{k}",
                "source": str(u),
                "target": str(v),
                "type": data.get("type", "CONNECTED_TO"),
                "confidence": data.get("confidence", 80),
                "properties": data.get("properties", {})
            })

        return {"nodes": nodes, "edges": edges}

    def get_ego_graph(self, center_node_id: str, hops: int = 2) -> Dict[str, Any]:
        """Extracts ego-network around a specified center entity."""
        c_str = str(center_node_id)
        if c_str not in self.graph:
            return {"nodes": [], "edges": []}
        
        undirected = self.graph.to_undirected()
        lengths = nx.single_source_shortest_path_length(undirected, c_str, cutoff=hops)
        sub_nodes = set(lengths.keys())
        sub = self.graph.subgraph(sub_nodes)

        nodes = []
        for n in sub.nodes():
            data = self.graph.nodes[n]
            nodes.append({
                "id": str(n),
                "label": data.get("label", str(n)),
                "type": data.get("type", "UNKNOWN"),
                "risk_score": data.get("risk_score", 50),
                "distance": lengths.get(n, 0),
                "properties": data.get("properties", {})
            })

        edges = []
        for u, v, k, data in sub.edges(data=True, keys=True):
            edges.append({
                "id": f"{u}->{v}:{k}",
                "source": str(u),
                "target": str(v),
                "type": data.get("type", "CONNECTED_TO"),
                "confidence": data.get("confidence", 80),
                "properties": data.get("properties", {})
            })

        return {"nodes": nodes, "edges": edges}

    def find_shortest_path(self, source_id: str, target_id: str) -> Dict[str, Any]:
        """Finds shortest investigative path between two entities."""
        s = str(source_id)
        t = str(target_id)
        if s not in self.graph or t not in self.graph:
            return {"found": False, "nodes": [], "edges": []}

        try:
            undirected = self.graph.to_undirected()
            path = nx.shortest_path(undirected, source=s, target=t)
            
            nodes = []
            for n in path:
                data = self.graph.nodes[n]
                nodes.append({
                    "id": str(n),
                    "label": data.get("label", str(n)),
                    "type": data.get("type", "UNKNOWN"),
                    "risk_score": data.get("risk_score", 50),
                    "properties": data.get("properties", {})
                })

            edges = []
            for i in range(len(path) - 1):
                u, v = path[i], path[i+1]
                edge_data = None
                if self.graph.has_edge(u, v):
                    edge_data = list(self.graph[u][v].values())[0]
                elif self.graph.has_edge(v, u):
                    edge_data = list(self.graph[v][u].values())[0]
                
                edges.append({
                    "id": f"{u}->{v}",
                    "source": u,
                    "target": v,
                    "type": edge_data.get("type", "LINKED") if edge_data else "LINKED",
                    "confidence": edge_data.get("confidence", 90) if edge_data else 90
                })

            return {"found": True, "length": len(path) - 1, "nodes": nodes, "edges": edges}
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return {"found": False, "nodes": [], "edges": []}

    def detect_communities(self) -> Dict[str, int]:
        """Clusters entities into cohesive syndicates/communities."""
        try:
            undirected = nx.Graph(self.graph)
            communities = nx.community.greedy_modularity_communities(undirected)
            cluster_map = {}
            for idx, comm in enumerate(communities):
                for node in comm:
                    cluster_map[node] = idx
            return cluster_map
        except Exception:
            return {n: 0 for n in self.graph.nodes()}

    def export_graphml(self) -> str:
        """Exports graph to standard GraphML format."""
        import io
        stream = io.BytesIO()
        g_simple = nx.DiGraph()
        for n, d in self.graph.nodes(data=True):
            g_simple.add_node(n, label=str(d.get("label", n)), type=str(d.get("type", "")))
        for u, v, d in self.graph.edges(data=True):
            g_simple.add_edge(u, v, type=str(d.get("type", "")), confidence=int(d.get("confidence", 80)))
        nx.write_graphml(g_simple, stream)
        return stream.getvalue().decode('utf-8')

graph_store = GraphStore()
