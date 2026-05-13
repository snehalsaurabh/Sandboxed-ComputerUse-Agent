# Counting letter occurrences
import string
with open('sample.txt', 'r') as f:
    text = f.read()
    # Convert to lowercase for accurate count
    text = text.lower()
    # Create a dictionary to store letter counts
    letter_counts = {letter: 0 for letter in string.ascii_lowercase}
    for char in text:
        if char.isalpha():
            letter_counts[char] += 1
    # Print results
    with open('result.txt', 'w') as f:
        for letter, count in sorted(letter_counts.items()):
            print(f'{letter}: {count}')