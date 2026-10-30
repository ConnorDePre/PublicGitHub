package graphs;

import java.util.*;

public class BreadthFirstSearch {

    /**
     * Performs BFS traversal on an adjacency-list graph.
     *
     * @param graph Graph represented by an adjacency list
     * @param start Starting vertex
     *
     * Time Complexity: O(V + E)
     * Space Complexity: O(V)
     */
    public static void bfs(
        Map<Integer, List<Integer>> graph,
        int start
    ) {

        Set<Integer> visited = new HashSet<>();
        Queue<Integer> queue = new ArrayDeque<>();

        visited.add(start);
        queue.add(start);

        while (!queue.isEmpty()) {

            int current = queue.poll();

            System.out.print(current + " ");

            for (int neighbor : graph.getOrDefault(
                current, Collections.emptyList()
            )) {

                if (!visited.contains(neighbor)) {

                    visited.add(neighbor);
                    queue.add(neighbor);
                }
            }
        }
    }

    public static void main(String[] args) {

        Map<Integer, List<Integer>> graph = new HashMap<>();

        graph.put(1, Arrays.asList(2, 3));
        graph.put(2, Arrays.asList(1, 4, 5));
        graph.put(3, Arrays.asList(1, 6));
        graph.put(4, Arrays.asList(2));
        graph.put(5, Arrays.asList(2));
        graph.put(6, Arrays.asList(3));

        bfs(graph, 1);
    }
}
