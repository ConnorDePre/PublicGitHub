package graphs;

import java.util.*;

public class DepthFirstSearch {

    /**
     * Performs Depth-First Search on a graph.
     *
     * @param graph Graph represented by an adjacency list
     * @param start Starting vertex
     *
     * Time Complexity: O(V + E)
     * Space Complexity: O(V)
     */
    public static void dfs(
        Map<Integer, List<Integer>> graph,
        int start
    ) {

        Set<Integer> visited = new HashSet<>();

        dfsRecursive(graph, start, visited);
    }

    /**
     * Recursive helper method for DFS traversal.
     */
    private static void dfsRecursive(
        Map<Integer, List<Integer>> graph,
        int current,
        Set<Integer> visited
    ) {

        // Prevent visiting the same node more than once
        if (visited.contains(current)) {
            return;
        }

        // Mark current node as visited
        visited.add(current);

        // Process current node
        System.out.print(current + " ");

        // Visit all neighboring nodes
        for (int neighbor : graph.getOrDefault(
            current, Collections.emptyList()
        )) {

            if (!visited.contains(neighbor)) {
                dfsRecursive(graph, neighbor, visited);
            }
        }
    }

    public static void main(String[] args) {

        // Create graph using an adjacency list
        Map<Integer, List<Integer>> graph = new HashMap<>();

        graph.put(1, Arrays.asList(2, 3));
        graph.put(2, Arrays.asList(1, 4, 5));
        graph.put(3, Arrays.asList(1, 6));
        graph.put(4, Arrays.asList(2));
        graph.put(5, Arrays.asList(2));
        graph.put(6, Arrays.asList(3));

        System.out.println("DFS Traversal:");

        dfs(graph, 1);
    }
}
