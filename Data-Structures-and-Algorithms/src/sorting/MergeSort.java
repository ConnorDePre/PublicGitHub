package sorting;

import java.util.Arrays;

public class MergeSort {

    /**
     * Sorts an array using merge sort.
     *
     * Time Complexity: O(n log n)
     * Space Complexity: O(n)
     */
    public static void sort(int[] array) {

        if (array.length <= 1) {
            return;
        }

        int middle = array.length / 2;

        int[] left = Arrays.copyOfRange(array, 0, middle);
        int[] right = Arrays.copyOfRange(
            array, middle, array.length
        );

        sort(left);
        sort(right);

        merge(array, left, right);
    }

    private static void merge(
        int[] array,
        int[] left,
        int[] right
    ) {

        int i = 0;
        int j = 0;
        int k = 0;

        while (i < left.length && j < right.length) {

            if (left[i] <= right[j]) {
                array[k++] = left[i++];
            } else {
                array[k++] = right[j++];
            }
        }

        while (i < left.length) {
            array[k++] = left[i++];
        }

        while (j < right.length) {
            array[k++] = right[j++];
        }
    }

    public static void main(String[] args) {

        int[] numbers = {38, 27, 43, 3, 9, 82, 10};

        sort(numbers);

        System.out.println(Arrays.toString(numbers));
    }
}
