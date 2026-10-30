package sorting;


import java.util.Arrays;

public class QuickSort {

    /**
     * Sorts an array using Quick Sort.
     *
     * @param array Array of integers to sort
     *
     * Average Time Complexity: O(n log n)
     * Worst Time Complexity: O(n^2)
     * Space Complexity: O(log n) average recursion stack
     */
    public static void sort(int[] array) {

        if (array == null || array.length <= 1) {
            return;
        }

        quickSort(array, 0, array.length - 1);
    }

    /**
     * Recursively sorts partitions of the array.
     */
    private static void quickSort(
        int[] array,
        int low,
        int high
    ) {

        if (low < high) {

            // Partition array and get pivot position
            int pivotIndex = partition(array, low, high);

            // Sort elements before the pivot
            quickSort(array, low, pivotIndex - 1);

            // Sort elements after the pivot
            quickSort(array, pivotIndex + 1, high);
        }
    }

    /**
     * Partitions array using the last element as pivot.
     */
    private static int partition(
        int[] array,
        int low,
        int high
    ) {

        int pivot = array[high];

        int i = low - 1;

        for (int j = low; j < high; j++) {

            if (array[j] <= pivot) {

                i++;

                // Swap elements
                swap(array, i, j);
            }
        }

        // Place pivot in its correct position
        swap(array, i + 1, high);

        return i + 1;
    }

    /**
     * Swaps two elements in an array.
     */
    private static void swap(
        int[] array,
        int i,
        int j
    ) {

        int temp = array[i];

        array[i] = array[j];

        array[j] = temp;
    }

    public static void main(String[] args) {

        int[] numbers = {10, 7, 8, 9, 1, 5};

        System.out.println(
            "Original Array: " + Arrays.toString(numbers)
        );

        sort(numbers);

        System.out.println(
            "Sorted Array: " + Arrays.toString(numbers)
        );
    }
}

