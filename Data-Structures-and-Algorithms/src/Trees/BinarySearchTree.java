package Trees;

import java.util.ArrayList;
import java.util.List;

public class BinarySearchTree {

    private static class Node {
        int value;
        Node left;
        Node right;

        Node(int value) {
            this.value = value;
        }
    }

    private Node root;

    // Insert a value into the BST
    public void insert(int value) {
        root = insertRecursive(root, value);
    }

    private Node insertRecursive(Node current, int value) {
        if (current == null) {
            return new Node(value);
        }

        if (value < current.value) {
            current.left = insertRecursive(current.left, value);
        } else if (value > current.value) {
            current.right = insertRecursive(current.right, value);
        }

        // Duplicate values are ignored
        return current;
    }

    // Search for a value in the BST
    public boolean search(int value) {
        return searchRecursive(root, value);
    }

    private boolean searchRecursive(Node current, int value) {
        if (current == null) {
            return false;
        }

        if (value == current.value) {
            return true;
        }

        if (value < current.value) {
            return searchRecursive(current.left, value);
        }

        return searchRecursive(current.right, value);
    }

    // Delete a value from the BST
    public void delete(int value) {
        root = deleteRecursive(root, value);
    }

    private Node deleteRecursive(Node current, int value) {
        if (current == null) {
            return null;
        }

        if (value < current.value) {
            current.left = deleteRecursive(current.left, value);
        } else if (value > current.value) {
            current.right = deleteRecursive(current.right, value);
        } else {
            // Case 1: Node has no children
            if (current.left == null && current.right == null) {
                return null;
            }

            // Case 2: Node has one child
            if (current.left == null) {
                return current.right;
            }

            if (current.right == null) {
                return current.left;
            }

            // Case 3: Node has two children
            int smallestValue = findMinimum(current.right);
            current.value = smallestValue;
            current.right = deleteRecursive(
                current.right, smallestValue
            );
        }

        return current;
    }

    // Find the smallest value in the tree
    private int findMinimum(Node current) {
        while (current.left != null) {
            current = current.left;
        }

        return current.value;
    }

    // Inorder traversal: Left -> Root -> Right
    public List<Integer> inorderTraversal() {
        List<Integer> result = new ArrayList<>();
        inorderRecursive(root, result);
        return result;
    }

    private void inorderRecursive(Node current, List<Integer> result) {
        if (current == null) {
            return;
        }

        inorderRecursive(current.left, result);
        result.add(current.value);
        inorderRecursive(current.right, result);
    }

    // Preorder traversal: Root -> Left -> Right
    public List<Integer> preorderTraversal() {
        List<Integer> result = new ArrayList<>();
        preorderRecursive(root, result);
        return result;
    }

    private void preorderRecursive(Node current, List<Integer> result) {
        if (current == null) {
            return;
        }

        result.add(current.value);
        preorderRecursive(current.left, result);
        preorderRecursive(current.right, result);
    }

    // Postorder traversal: Left -> Right -> Root
    public List<Integer> postorderTraversal() {
        List<Integer> result = new ArrayList<>();
        postorderRecursive(root, result);
        return result;
    }

    private void postorderRecursive(Node current, List<Integer> result) {
        if (current == null) {
            return;
        }

        postorderRecursive(current.left, result);
        postorderRecursive(current.right, result);
        result.add(current.value);
    }

    public static void main(String[] args) {
        BinarySearchTree bst = new BinarySearchTree();

        bst.insert(50);
        bst.insert(30);
        bst.insert(70);
        bst.insert(20);
        bst.insert(40);
        bst.insert(60);
        bst.insert(80);

        System.out.println("Inorder: " + bst.inorderTraversal());
        System.out.println("Preorder: " + bst.preorderTraversal());
        System.out.println("Postorder: " + bst.postorderTraversal());

        System.out.println("Search 40: " + bst.search(40));
        System.out.println("Search 90: " + bst.search(90));

        bst.delete(30);

        System.out.println("After deleting 30: "
                + bst.inorderTraversal());
    }
}
