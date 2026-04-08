export const defaultSourceLanguage = "c";
export const defaultTargetLanguage = "cpp";

export const languageOptions = [
  { value: "c", label: "C", aceMode: "c_cpp" },
  { value: "cpp", label: "C++", aceMode: "c_cpp" },
  { value: "javascript", label: "JavaScript", aceMode: "javascript" },
  { value: "typescript", label: "TypeScript", aceMode: "typescript" },
  { value: "python", label: "Python", aceMode: "python" },
  { value: "java", label: "Java", aceMode: "java" },
  { value: "go", label: "Go", aceMode: "golang" },
  { value: "rust", label: "Rust", aceMode: "rust" },
  { value: "csharp", label: "C#", aceMode: "csharp" },
  { value: "php", label: "PHP", aceMode: "php" },
];

export const instructionPresets = [
  "Preserve variable names where possible.",
  "Prefer idiomatic target language syntax.",
  "Keep the same algorithmic complexity.",
  "Add lightweight comments only for tricky parts.",
];

export const exampleCodeByLanguage = {
  c: `#include <stdio.h>

int factorial(int number) {
  if (number <= 1) {
    return 1;
  }

  return number * factorial(number - 1);
}

int main() {
  int value = 5;
  printf("factorial(%d) = %d\\n", value, factorial(value));
  return 0;
}`,
  cpp: `#include <iostream>
#include <vector>

int sumEvenNumbers(const std::vector<int>& values) {
  int total = 0;

  for (int value : values) {
    if (value % 2 == 0) {
      total += value;
    }
  }

  return total;
}

int main() {
  std::vector<int> values{1, 2, 3, 4, 5, 6};
  std::cout << "Total: " << sumEvenNumbers(values) << std::endl;
  return 0;
}`,
  javascript: `function groupAdultsByCity(people) {
  return people
    .filter((person) => person.age >= 18)
    .reduce((groups, person) => {
      const city = person.city;
      groups[city] = groups[city] ?? [];
      groups[city].push(person.name);
      return groups;
    }, {});
}

console.log(
  groupAdultsByCity([
    { name: "Aarav", age: 22, city: "Pune" },
    { name: "Mia", age: 17, city: "Pune" },
    { name: "Noah", age: 29, city: "Delhi" },
  ])
);`,
  typescript: `type ApiResult<T> = {
  data: T;
  success: boolean;
};

function unwrapResult<T>(result: ApiResult<T>): T {
  if (!result.success) {
    throw new Error("Request failed");
  }

  return result.data;
}

const username = unwrapResult<string>({ data: "appixo", success: true });
console.log(username);`,
  python: `def fibonacci(limit):
    sequence = [0, 1]

    while sequence[-1] + sequence[-2] <= limit:
        sequence.append(sequence[-1] + sequence[-2])

    return sequence


print(fibonacci(34))`,
  java: `import java.util.List;

public class App {
  public static long countLongWords(List<String> words) {
    return words.stream()
        .filter(word -> word.length() > 5)
        .count();
  }

  public static void main(String[] args) {
    System.out.println(countLongWords(List.of("convert", "code", "between", "languages")));
  }
}`,
  go: `package main

import "fmt"

func average(values []int) float64 {
  total := 0

  for _, value := range values {
    total += value
  }

  return float64(total) / float64(len(values))
}

func main() {
  fmt.Println(average([]int{10, 20, 30, 40}))
}`,
  rust: `fn reverse_words(text: &str) -> String {
    text
      .split_whitespace()
      .rev()
      .collect::<Vec<&str>>()
      .join(" ")
}

fn main() {
  println!("{}", reverse_words("convert code with confidence"));
}`,
  csharp: `using System;
using System.Linq;

class Program
{
    static int[] SquareAll(int[] numbers)
    {
        return numbers.Select(number => number * number).ToArray();
    }

    static void Main()
    {
        Console.WriteLine(string.Join(", ", SquareAll(new[] { 1, 2, 3, 4 })));
    }
}`,
  php: `<?php

function formatInventory(array $items): array
{
    return array_map(
        fn ($item) => strtoupper($item["name"]) . ":" . $item["stock"],
        $items
    );
}

$inventory = [
    ["name" => "keyboard", "stock" => 12],
    ["name" => "mouse", "stock" => 18],
];

print_r(formatInventory($inventory));`,
};

export const getLanguageOption = (value) =>
  languageOptions.find((option) => option.value === value);

export const getAceMode = (value) =>
  getLanguageOption(value)?.aceMode || "text";
