import networkx as nx


def build_knowledge_graph(topics: list) -> nx.DiGraph:
    """
    topics: list of Topic ORM objects with .name, .subject, .prerequisites
    Edge direction: prerequisite -> topic (A must be learned before B)
    """
    graph = nx.DiGraph()
    for topic in topics:
        graph.add_node(
            topic.name,
            subject=topic.subject,
        )
        prereqs = topic.prerequisites or []
        for prereq in prereqs:
            graph.add_node(prereq)
            graph.add_edge(prereq, topic.name)
    return graph


def find_root_problem(weak_topics: list[str], graph: nx.DiGraph) -> str:
    """
    Among weak topics, find the most foundational one.

    Algorithm:
    1. Filter to only topics that exist in graph
    2. For each weak topic, find its predecessors
    3. Root = weak topic whose predecessors are NOT weak
       (it has no weak prerequisite - it IS the root)
    4. Among roots, pick the one with most weak descendants
       (fixing it unblocks the most other topics)
    """
    if not weak_topics:
        return "Нет проблемных тем"

    weak_set = set(weak_topics)
    in_graph = [t for t in weak_topics if t in graph]

    if not in_graph:
        return weak_topics[0]

    roots = []
    for topic in in_graph:
        predecessors = list(graph.predecessors(topic))
        weak_preds = [p for p in predecessors if p in weak_set]
        if not weak_preds:
            roots.append(topic)

    if not roots:
        roots = in_graph

    def weak_descendants(topic_name: str) -> int:
        try:
            descendants = nx.descendants(graph, topic_name)
            return len(descendants & weak_set)
        except Exception:
            return 0

    roots.sort(key=weak_descendants, reverse=True)
    return roots[0]


def get_study_path(
    root: str,
    target: str,
    graph: nx.DiGraph,
) -> list[str]:
    """Shortest prerequisite path from root to target."""
    try:
        if root == target:
            return [root]
        return nx.shortest_path(graph, root, target)
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return [root, target]
