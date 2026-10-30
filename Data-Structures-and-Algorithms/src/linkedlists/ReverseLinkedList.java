package linkedlists;

public class ReverseLinkedList {

    static class Node {
        int data;
        Node next;

        Node(int data) {
            this.data = data;
            this.next = null;
        }
    }

    /**
     * Reverses a singly linked list in place.
     *
     * @param head First node of the list
     * @return New head of the reversed list
     *
     * Time Complexity: O(n)
     * Space Complexity: O(1)
     */
    public static Node reverse(Node head) {

        Node previous = null;
        Node current = head;

        while (current != null) {

            Node nextNode = current.next;

            current.next = previous;

            previous = current;
            current = nextNode;
        }

        return previous;
    }

    public static void printList(Node head) {

        Node current = head;

        while (current != null) {
            System.out.print(current.data + " → ");
            current = current.next;
        }

        System.out.println("null");
    }

    public static void main(String[] args) {

        Node head = new Node(10);
        head.next = new Node(20);
        head.next.next = new Node(30);
        head.next.next.next = new Node(40);

        System.out.println("Original:");
        printList(head);

        head = reverse(head);

        System.out.println("Reversed:");
        printList(head);
    }
}
