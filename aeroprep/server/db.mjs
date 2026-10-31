// ==========================================================================
// aeroprep/server/db.mjs
// --------------------------------------------------------------------------
// Lightweight, zero-dependency, ACID-safe JSON file-backed database engine
// for AeroPrep. Automatically initializes schema, indices, and seed data.
// ==========================================================================

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DATA_DIR = resolve(__dirname, 'data');
const DB_FILE = join(DATA_DIR, 'aeroprep_db.json');

// Ensure data folder exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Password hashing utilities using scrypt with cryptographic salts
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, storedHash, storedSalt) {
  try {
    const hashBuffer = scryptSync(password, storedSalt, 64);
    const storedBuffer = Buffer.from(storedHash, 'hex');
    return timingSafeEqual(hashBuffer, storedBuffer);
  } catch {
    return false;
  }
}

// --------------------------------------------------------------------------
// Default Seed Data
// --------------------------------------------------------------------------

function createInitialData() {
  const adminPass = hashPassword('Admin@12345');
  const studentPass = hashPassword('Student@12345');

  return {
    meta: {
      version: '2.0.0',
      lastSaved: new Date().toISOString(),
      platform: 'AeroPrep Career Preparation Platform',
    },
    users: [
      {
        id: 'usr_admin',
        name: 'Prof. Rajesh Sharma',
        email: 'admin@aeroprep.edu',
        passwordHash: adminPass.hash,
        salt: adminPass.salt,
        role: 'admin',
        college: 'National Institute of Technology',
        branch: 'Computer Science & Engineering',
        gradYear: '2024',
        targetRole: 'Training & Placement Officer',
        targetCompanies: ['Google', 'Microsoft', 'Amazon', 'TCS Digital'],
        avatar: '👨‍🏫',
        bio: 'Faculty placement coordinator & platform administrator.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'usr_alex',
        name: 'Alex Johnson',
        email: 'alex.student@aeroprep.edu',
        passwordHash: studentPass.hash,
        salt: studentPass.salt,
        role: 'student',
        college: 'State Technological University',
        branch: 'Information Technology',
        gradYear: '2026',
        targetRole: 'Full Stack Software Engineer',
        targetCompanies: ['Google', 'Amazon', 'Atlassian', 'Microsoft'],
        avatar: '🚀',
        bio: 'Final year engineering student preparing for SDE-1 placement drives.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    technicalTopics: [
      {
        id: 'c-pointers',
        category: 'c',
        categoryLabel: 'C Programming',
        title: 'Pointers & Dynamic Memory Allocation',
        difficulty: 'Medium',
        readTimeMin: 12,
        summary: 'Deep dive into memory addressing, pointer arithmetic, void pointers, function pointers, and malloc/calloc/realloc/free.',
        keyConcepts: [
          'A pointer holds the virtual memory address of another variable.',
          'Pointer arithmetic operates in units of sizeof(target_type).',
          'malloc allocates uninitialized bytes; calloc zeroes memory; free prevents memory leaks.',
          'Dangling pointers point to deallocated memory; always assign NULL after free.'
        ],
        codeSnippet: `int *ptr = (int *)malloc(5 * sizeof(int));\nif (!ptr) { perror("Allocation failed"); exit(1); }\nfor (int i = 0; i < 5; i++) ptr[i] = (i + 1) * 10;\nfree(ptr);\nptr = NULL; // Prevent dangling pointer`,
        practiceQuestions: [
          {
            question: 'What is the value of *ptr after free(ptr) is called without assigning ptr = NULL?',
            options: ['0', 'Null', 'Undefined behavior (dangling pointer)', 'Compilation error'],
            correctIndex: 2,
            explanation: 'Calling free deallocates the heap memory, but the pointer variable still contains the old address, creating a dangling pointer. Dereferencing it yields undefined behavior.'
          },
          {
            question: 'Which allocation function initializes allocated bytes to zero?',
            options: ['malloc()', 'calloc()', 'realloc()', 'alloc()'],
            correctIndex: 1,
            explanation: 'calloc(n, size) initializes every byte in the allocated region to zero, whereas malloc leaves bytes uninitialized.'
          }
        ]
      },
      {
        id: 'python-gil-oop',
        category: 'python',
        categoryLabel: 'Python',
        title: 'Global Interpreter Lock (GIL) & Dunder Methods',
        difficulty: 'Medium',
        readTimeMin: 10,
        summary: 'Understand CPython GIL, CPU vs I/O bound concurrency, decorators, and magic methods (__init__, __str__, __repr__, __call__).',
        keyConcepts: [
          'The GIL allows only one native thread to execute Python bytecode at once in CPython.',
          'For CPU-bound tasks, use multiprocessing or external C extensions; for I/O-bound tasks, use asyncio or threading.',
          'Dunder methods overload operators and hook into Python data model protocols.'
        ],
        codeSnippet: `class Vector:\n    def __init__(self, x, y):\n        self.x, self.y = x, y\n    def __add__(self, other):\n        return Vector(self.x + other.x, self.y + other.y)\n    def __repr__(self):\n        return f"Vector({self.x}, {self.y})"`,
        practiceQuestions: [
          {
            question: 'Why does multi-threading in CPython not speed up pure CPU-intensive arithmetic tasks?',
            options: [
              'Python cannot create real OS threads',
              'The Global Interpreter Lock restricts bytecode execution to one thread at a time',
              'Python math module is single-threaded only',
              'Operating systems do not schedule Python threads'
            ],
            correctIndex: 1,
            explanation: 'In CPython, the GIL enforces that only one thread can execute Python bytecode at a time, preventing multi-core speedup for pure CPU-bound Python operations.'
          }
        ]
      },
      {
        id: 'java-collections-jvm',
        category: 'java',
        categoryLabel: 'Java',
        title: 'Java Collections Framework & JVM Internals',
        difficulty: 'Hard',
        readTimeMin: 15,
        summary: 'Internal mechanics of HashMap (bucket arrays, linked lists, red-black trees), JVM heap generations (Young, Old, Metaspace), and garbage collection.',
        keyConcepts: [
          'HashMap converts keys into hash codes, modded with bucket capacity. In Java 8+, bins convert from linked lists to Red-Black Trees when bucket size exceeds 8.',
          'Young Generation consists of Eden and Survivor spaces (S0, S1) for short-lived objects.',
          'Old/Tenured generation holds long-lived survivors; GC here is full major GC.'
        ],
        codeSnippet: `Map<String, Integer> map = new HashMap<>();\nmap.put("AeroPrep", 100);\nmap.computeIfAbsent("DSA", k -> k.length() * 10);\nmap.forEach((k, v) -> System.out.println(k + " -> " + v));`,
        practiceQuestions: [
          {
            question: 'In Java 8+, at what linked list collision threshold does a HashMap bucket transform into a Red-Black Tree?',
            options: ['4', '6', '8', '16'],
            correctIndex: 2,
            explanation: 'When the number of entries in a bucket exceeds TREEIFY_THRESHOLD (8) and table capacity is at least 64, the linked list is treeified to guarantee O(log N) worst-case lookup.'
          }
        ]
      },
      {
        id: 'dsa-graphs-dp',
        category: 'dsa',
        categoryLabel: 'Data Structures & Algorithms',
        title: 'Graph Traversals (BFS/DFS) & Dynamic Programming',
        difficulty: 'Hard',
        readTimeMin: 18,
        summary: 'Breadth-First Search for shortest paths, Depth-First Search for cycle detection and topological sorting, and DP memoization vs tabulation.',
        keyConcepts: [
          'BFS uses a Queue to explore level-by-level (unweighted shortest path).',
          'DFS uses a Stack / recursion; tracks recursion call stack for cycle detection in directed graphs.',
          'DP applies when problems exhibit Overlapping Subproblems and Optimal Substructure.'
        ],
        codeSnippet: `// 0/1 Knapsack DP Tabulation\nint knapSack(int W, int wt[], int val[], int n) {\n    int dp[W + 1] = {0};\n    for (int i = 0; i < n; i++) {\n        for (int w = W; w >= wt[i]; w--) {\n            dp[w] = max(dp[w], val[i] + dp[w - wt[i]]);\n        }\n    }\n    return dp[W];\n}`,
        practiceQuestions: [
          {
            question: 'What is the time complexity of BFS on an adjacency list graph with V vertices and E edges?',
            options: ['O(V^2)', 'O(V + E)', 'O(V * E)', 'O(E log V)'],
            correctIndex: 1,
            explanation: 'Every vertex is enqueued once O(V), and every edge is visited once O(E), yielding O(V + E).'
          }
        ]
      },
      {
        id: 'dbms-acid-indexing',
        category: 'dbms',
        categoryLabel: 'DBMS',
        title: 'ACID Properties, Transactions & B+ Tree Indexing',
        difficulty: 'Medium',
        readTimeMin: 14,
        summary: 'Atomicity, Consistency, Isolation levels (Read Uncommitted, Read Committed, Repeatable Read, Serializable), B+ tree indices vs Hash indices.',
        keyConcepts: [
          'Atomicity guarantees all-or-nothing execution via write-ahead logging (WAL).',
          'Isolation levels mitigate Dirty Reads, Non-repeatable Reads, and Phantom Reads.',
          'B+ Tree indices store all record pointers in leaf nodes connected as a doubly linked list, optimizing range queries.'
        ],
        codeSnippet: `START TRANSACTION;\nSELECT balance FROM accounts WHERE user_id = 42 FOR UPDATE;\nUPDATE accounts SET balance = balance - 500 WHERE user_id = 42;\nUPDATE accounts SET balance = balance + 500 WHERE user_id = 99;\nCOMMIT;`,
        practiceQuestions: [
          {
            question: 'Which transaction isolation level prevents both Dirty Reads and Non-Repeatable Reads, but allows Phantom Reads in standard ANSI SQL?',
            options: ['Read Uncommitted', 'Read Committed', 'Repeatable Read', 'Serializable'],
            correctIndex: 2,
            explanation: 'Repeatable Read locks read rows preventing modifications, but new rows inserted by concurrent transactions can still appear (phantom reads).'
          }
        ]
      },
      {
        id: 'os-deadlocks-concurrency',
        category: 'os',
        categoryLabel: 'Operating Systems',
        title: 'Deadlocks, Banker’s Algorithm & Process Synchronization',
        difficulty: 'Hard',
        readTimeMin: 16,
        summary: 'The 4 Coffman conditions for deadlocks, Banker’s safe state evaluation, Mutex vs Semaphore, and Producer-Consumer solution.',
        keyConcepts: [
          'Four Deadlock conditions: Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait.',
          'A Binary Semaphore acts as a Mutex, whereas a Counting Semaphore manages pools of identical resources.',
          'Context switching overhead involves saving PCB registers, program counter, and cache invalidation.'
        ],
        codeSnippet: `// Producer-Consumer Semaphore\nwait(empty);\nwait(mutex);\n// critical section: insert item into buffer\nsignal(mutex);\nsignal(full);`,
        practiceQuestions: [
          {
            question: 'Which condition is invalidated when processes must request all resources simultaneously upfront?',
            options: ['Mutual Exclusion', 'Hold and Wait', 'No Preemption', 'Circular Wait'],
            correctIndex: 1,
            explanation: 'Requiring a process to hold no resources while requesting new ones directly breaks the "Hold and Wait" condition.'
          }
        ]
      },
      {
        id: 'cn-tcp-ip-osi',
        category: 'networks',
        categoryLabel: 'Computer Networks',
        title: 'TCP 3-Way Handshake, Flow Control & OSI Layering',
        difficulty: 'Medium',
        readTimeMin: 12,
        summary: 'SYN, SYN-ACK, ACK handshake, TCP Sliding Window flow control, Congestion Control (Slow Start, Congestion Avoidance), DNS lookup journey.',
        keyConcepts: [
          'TCP provides connection-oriented, reliable, ordered, byte-stream delivery with congestion control.',
          'UDP is connectionless and low-overhead, suitable for streaming and DNS lookups.',
          'HTTPS establishes TLS session through asymmetric key exchange, then switches to symmetric cipher for data.'
        ],
        codeSnippet: `Client -------- SYN (Seq=x) --------> Server\nClient <--- SYN-ACK (Seq=y, Ack=x+1) - Server\nClient -------- ACK (Ack=y+1) --------> Server`,
        practiceQuestions: [
          {
            question: 'What is the purpose of the TIME_WAIT state at the end of a TCP connection termination?',
            options: [
              'To allow leftover packets in the network to expire and ensure the final ACK was received',
              'To keep the server socket open for new clients',
              'To reset window size',
              'To compress header buffers'
            ],
            correctIndex: 0,
            explanation: 'TIME_WAIT (usually 2 x MSL) ensures the remote peer received the final ACK and prevents old duplicate packets from interfering with a future connection on the same port.'
          }
        ]
      },
      {
        id: 'oop-design-patterns',
        category: 'oop',
        categoryLabel: 'Object-Oriented Programming',
        title: 'SOLID Principles & Gang of Four Design Patterns',
        difficulty: 'Medium',
        readTimeMin: 14,
        summary: 'Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion; Factory, Singleton, Strategy, and Observer patterns.',
        keyConcepts: [
          'Open/Closed Principle: Software entities should be open for extension, but closed for modification.',
          'Strategy Pattern defines a family of algorithms, encapsulates each one, and makes them interchangeable at runtime.',
          'Observer Pattern establishes a 1-to-many dependency so when one object changes state, all dependents are notified.'
        ],
        codeSnippet: `// Strategy Pattern in TypeScript\ninterface SortStrategy { sort(data: number[]): number[]; }\nclass QuickSort implements SortStrategy { sort(d: number[]) { return d.sort((a,b)=>a-b); } }\nclass Sorter { constructor(private strategy: SortStrategy) {}\n  execute(data: number[]) { return this.strategy.sort(data); }\n}`,
        practiceQuestions: [
          {
            question: 'Which SOLID principle states that high-level modules should not depend on low-level modules, but both should depend on abstractions?',
            options: ['Single Responsibility', 'Open-Closed', 'Liskov Substitution', 'Dependency Inversion'],
            correctIndex: 3,
            explanation: 'Dependency Inversion Principle (DIP) decouples high-level policy code from low-level implementation details through interfaces/abstractions.'
          }
        ]
      },
      {
        id: 'sql-window-functions',
        category: 'sql',
        categoryLabel: 'SQL',
        title: 'Window Functions, CTEs & Query Optimization',
        difficulty: 'Medium',
        readTimeMin: 12,
        summary: 'ROW_NUMBER(), RANK(), DENSE_RANK(), Common Table Expressions (WITH clauses), subquery unnesting, and EXPLAIN plans.',
        keyConcepts: [
          'Window functions calculate aggregations across a set of rows while retaining each individual row in the result.',
          'DENSE_RANK() does not skip rank values after duplicates, whereas RANK() leaves gaps.',
          'CTEs improve query readability and allow recursive queries for hierarchical data.'
        ],
        codeSnippet: `WITH RankedSalaries AS (\n  SELECT employee_id, department_id, salary,\n         DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) as rank_num\n  FROM employees\n)\nSELECT * FROM RankedSalaries WHERE rank_num <= 3;`,
        practiceQuestions: [
          {
            question: 'What is the main difference between RANK() and DENSE_RANK()?',
            options: [
              'RANK() requires an ORDER BY clause, DENSE_RANK() does not',
              'RANK() skips subsequent rank numbers after ties, DENSE_RANK() does not',
              'DENSE_RANK() works only on integers',
              'There is no functional difference'
            ],
            correctIndex: 1,
            explanation: 'If two rows tie for rank 1, RANK() assigns the next row rank 3, whereas DENSE_RANK() assigns the next row rank 2.'
          }
        ]
      },
      {
        id: 'webdev-event-loop',
        category: 'webdev',
        categoryLabel: 'Web Development',
        title: 'JavaScript Event Loop, Microtasks & CORS Architecture',
        difficulty: 'Medium',
        readTimeMin: 12,
        summary: 'Call Stack, Web APIs, Microtask Queue (Promises, queueMicrotask), Macrotask Queue (setTimeout), Cross-Origin Resource Sharing preflights.',
        keyConcepts: [
          'Microtasks (resolved promises) execute immediately after the current synchronous script runs, before the next macrotask is dequeued.',
          'CORS preflight (OPTIONS request) is sent by browsers for non-simple requests to verify Access-Control-Allow-Origin headers.',
          'React reconciliation uses virtual DOM diffing (heuristics O(N)) with keys to minimize costly real DOM reflows.'
        ],
        codeSnippet: `console.log('1');\nsetTimeout(() => console.log('2'), 0);\nPromise.resolve().then(() => console.log('3'));\nconsole.log('4');\n// Output: 1, 4, 3, 2`,
        practiceQuestions: [
          {
            question: 'What will be the execution order for console outputs in standard JavaScript event loop?',
            options: ['1, 2, 3, 4', '1, 4, 2, 3', '1, 4, 3, 2', '1, 3, 4, 2'],
            correctIndex: 2,
            explanation: 'Synchronous statements (1, 4) execute first, followed by microtasks from Promise.then (3), followed by macrotasks from setTimeout (2).'
          }
        ]
      }
    ],
    codingProblems: [
      {
        id: 'two-sum',
        title: 'Two Sum',
        slug: 'two-sum',
        difficulty: 'Easy',
        category: 'Arrays & Hashing',
        description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice. Return the answer in any order.',
        inputFormat: 'Line 1: Comma-separated array of integers\nLine 2: Single target integer',
        outputFormat: 'Array indices [i, j]',
        constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.',
        examples: [
          {
            input: 'nums = [2,7,11,15], target = 9',
            output: '[0, 1]',
            explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
          },
          {
            input: 'nums = [3,2,4], target = 6',
            output: '[1, 2]',
            explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].'
          }
        ],
        starterCode: {
          python: `def twoSum(nums: list[int], target: int) -> list[int]:\n    # Write your solution here\n    hashmap = {}\n    for i, n in enumerate(nums):\n        diff = target - n\n        if diff in hashmap:\n            return [hashmap[diff], i]\n        hashmap[n] = i\n    return []`,
          java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution here\n        java.util.Map<Integer, Integer> map = new java.util.HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int comp = target - nums[i];\n            if (map.containsKey(comp)) return new int[]{map.get(comp), i};\n            map.put(nums[i], i);\n        }\n        return new int[]{};\n    }\n}`,
          cpp: `#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int, int> seen;\n        for (int i = 0; i < nums.size(); i++) {\n            int complement = target - nums[i];\n            if (seen.count(complement)) return {seen[complement], i};\n            seen[nums[i]] = i;\n        }\n        return {};\n    }\n};`,
          c: `/**\n * Note: The returned array must be malloced, assume caller calls free().\n */\nint* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n    *returnSize = 2;\n    int* res = (int*)malloc(2 * sizeof(int));\n    for (int i = 0; i < numsSize; i++) {\n        for (int j = i + 1; j < numsSize; j++) {\n            if (nums[i] + nums[j] == target) {\n                res[0] = i; res[1] = j;\n                return res;\n            }\n        }\n    }\n    return res;\n}`
        },
        testCases: [
          { input: '[2,7,11,15], target=9', expectedOutput: '[0, 1]', isHidden: false },
          { input: '[3,2,4], target=6', expectedOutput: '[1, 2]', isHidden: false },
          { input: '[3,3], target=6', expectedOutput: '[0, 1]', isHidden: true },
          { input: '[1,5,8,12,19], target=20', expectedOutput: '[0, 4]', isHidden: true }
        ]
      },
      {
        id: 'valid-parentheses',
        title: 'Valid Parentheses',
        slug: 'valid-parentheses',
        difficulty: 'Easy',
        category: 'Stacks',
        description: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.',
        inputFormat: 'A string s containing only brackets',
        outputFormat: 'boolean true or false',
        constraints: '1 <= s.length <= 10^4\ns consists of parentheses only `()[]{}`.',
        examples: [
          {
            input: 's = "()"',
            output: 'true',
            explanation: 'The opening round bracket is properly closed.'
          },
          {
            input: 's = "()[]{}"',
            output: 'true',
            explanation: 'All three bracket types are opened and closed in sequence.'
          },
          {
            input: 's = "(]"',
            output: 'false',
            explanation: 'Round bracket cannot be closed with a square bracket.'
          }
        ],
        starterCode: {
          python: `def isValid(s: str) -> bool:\n    stack = []\n    mapping = {")": "(", "}": "{", "]": "["}\n    for char in s:\n        if char in mapping:\n            top = stack.pop() if stack else '#'\n            if mapping[char] != top: return False\n        else:\n            stack.append(char)\n    return not stack`,
          java: `class Solution {\n    public boolean isValid(String s) {\n        java.util.Stack<Character> stack = new java.util.Stack<>();\n        for (char c : s.toCharArray()) {\n            if (c == '(') stack.push(')');\n            else if (c == '{') stack.push('}');\n            else if (c == '[') stack.push(']');\n            else if (stack.isEmpty() || stack.pop() != c) return false;\n        }\n        return stack.isEmpty();\n    }\n}`,
          cpp: `#include <string>\n#include <stack>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isValid(string s) {\n        stack<char> st;\n        for (char c : s) {\n            if (c == '(' || c == '{' || c == '[') st.push(c);\n            else {\n                if (st.empty()) return false;\n                if (c == ')' && st.top() != '(') return false;\n                if (c == '}' && st.top() != '{') return false;\n                if (c == ']' && st.top() != '[') return false;\n                st.pop();\n            }\n        }\n        return st.empty();\n    }\n};`,
          c: `bool isValid(char* s) {\n    char stack[10005];\n    int top = -1;\n    for (int i = 0; s[i] != '\\0'; i++) {\n        char c = s[i];\n        if (c == '(' || c == '{' || c == '[') stack[++top] = c;\n        else {\n            if (top < 0) return false;\n            char o = stack[top--];\n            if (c == ')' && o != '(') return false;\n            if (c == '}' && o != '{') return false;\n            if (c == ']' && o != '[') return false;\n        }\n    }\n    return top == -1;\n}`
        },
        testCases: [
          { input: '"()"', expectedOutput: 'true', isHidden: false },
          { input: '"()[]{}"', expectedOutput: 'true', isHidden: false },
          { input: '"(]"', expectedOutput: 'false', isHidden: false },
          { input: '"([)]"', expectedOutput: 'false', isHidden: true },
          { input: '"{[]}"', expectedOutput: 'true', isHidden: true }
        ]
      },
      {
        id: 'reverse-linked-list',
        title: 'Reverse Linked List',
        slug: 'reverse-linked-list',
        difficulty: 'Easy',
        category: 'Linked Lists',
        description: 'Given the `head` of a singly linked list, reverse the list, and return the reversed list head pointer.',
        inputFormat: 'Linked list head node: [1,2,3,4,5]',
        outputFormat: 'Reversed list: [5,4,3,2,1]',
        constraints: 'The number of nodes in the list is the range [0, 5000].\n-5000 <= Node.val <= 5000',
        examples: [
          {
            input: 'head = [1,2,3,4,5]',
            output: '[5,4,3,2,1]',
            explanation: 'The linked list pointers are redirected backwards.'
          }
        ],
        starterCode: {
          python: `# Definition for singly-linked list.\n# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\ndef reverseList(head):\n    prev = None\n    curr = head\n    while curr:\n        nxt = curr.next\n        curr.next = prev\n        prev = curr\n        curr = nxt\n    return prev`,
          java: `class Solution {\n    public ListNode reverseList(ListNode head) {\n        ListNode prev = null;\n        ListNode curr = head;\n        while (curr != null) {\n            ListNode next = curr.next;\n            curr.next = prev;\n            prev = curr;\n            curr = next;\n        }\n        return prev;\n    }\n}`,
          cpp: `class Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        ListNode* prev = nullptr;\n        ListNode* curr = head;\n        while (curr) {\n            ListNode* next = curr->next;\n            curr->next = prev;\n            prev = curr;\n            curr = next;\n        }\n        return prev;\n    }\n};`,
          c: `struct ListNode* reverseList(struct ListNode* head) {\n    struct ListNode* prev = NULL;\n    struct ListNode* curr = head;\n    while (curr) {\n        struct ListNode* next = curr->next;\n        curr->next = prev;\n        prev = curr;\n        curr = next;\n    }\n    return prev;\n}`
        },
        testCases: [
          { input: '[1,2,3,4,5]', expectedOutput: '[5,4,3,2,1]', isHidden: false },
          { input: '[1,2]', expectedOutput: '[2,1]', isHidden: false },
          { input: '[]', expectedOutput: '[]', isHidden: true }
        ]
      },
      {
        id: 'longest-substring-without-repeating-characters',
        title: 'Longest Substring Without Repeating Characters',
        slug: 'longest-substring-without-repeating-characters',
        difficulty: 'Medium',
        category: 'Two Pointers & Sliding Window',
        description: 'Given a string `s`, find the length of the longest substring without duplicate characters.',
        inputFormat: 'A string s',
        outputFormat: 'Integer representing maximum length',
        constraints: '0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols and spaces.',
        examples: [
          {
            input: 's = "abcabcbb"',
            output: '3',
            explanation: 'The answer is "abc", with the length of 3.'
          },
          {
            input: 's = "bbbbb"',
            output: '1',
            explanation: 'The answer is "b", with the length of 1.'
          },
          {
            input: 's = "pwwkew"',
            output: '3',
            explanation: 'The answer is "wke", with length of 3.'
          }
        ],
        starterCode: {
          python: `def lengthOfLongestSubstring(s: str) -> int:\n    char_index = {}\n    left = 0\n    max_len = 0\n    for right, char in enumerate(s):\n        if char in char_index and char_index[char] >= left:\n            left = char_index[char] + 1\n        char_index[char] = right\n        max_len = max(max_len, right - left + 1)\n    return max_len`,
          java: `class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        int max = 0, left = 0;\n        java.util.Map<Character, Integer> map = new java.util.HashMap<>();\n        for (int right = 0; right < s.length(); right++) {\n            char c = s.charAt(right);\n            if (map.containsKey(c) && map.get(c) >= left) {\n                left = map.get(c) + 1;\n            }\n            map.put(c, right);\n            max = Math.max(max, right - left + 1);\n        }\n        return max;\n    }\n}`,
          cpp: `#include <string>\n#include <unordered_map>\n#include <algorithm>\nusing namespace std;\n\nclass Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        unordered_map<char, int> seen;\n        int left = 0, maxLen = 0;\n        for (int right = 0; right < s.size(); right++) {\n            if (seen.count(s[right]) && seen[s[right]] >= left) {\n                left = seen[s[right]] + 1;\n            }\n            seen[s[right]] = right;\n            maxLen = max(maxLen, right - left + 1);\n        }\n        return maxLen;\n    }\n};`,
          c: `int lengthOfLongestSubstring(char* s) {\n    int lastPos[256];\n    for (int i = 0; i < 256; i++) lastPos[i] = -1;\n    int left = 0, maxLen = 0;\n    for (int right = 0; s[right] != '\\0'; right++) {\n        unsigned char c = (unsigned char)s[right];\n        if (lastPos[c] >= left) left = lastPos[c] + 1;\n        lastPos[c] = right;\n        int len = right - left + 1;\n        if (len > maxLen) maxLen = len;\n    }\n    return maxLen;\n}`
        },
        testCases: [
          { input: '"abcabcbb"', expectedOutput: '3', isHidden: false },
          { input: '"bbbbb"', expectedOutput: '1', isHidden: false },
          { input: '"pwwkew"', expectedOutput: '3', isHidden: false },
          { input: '""', expectedOutput: '0', isHidden: true },
          { input: '"au"', expectedOutput: '2', isHidden: true }
        ]
      },
      {
        id: 'merge-intervals',
        title: 'Merge Intervals',
        slug: 'merge-intervals',
        difficulty: 'Medium',
        category: 'Arrays & Sorting',
        description: 'Given an array of `intervals` where `intervals[i] = [start_i, end_i]`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.',
        inputFormat: '2D integer array intervals',
        outputFormat: '2D integer array merged',
        constraints: '1 <= intervals.length <= 10^4\nintervals[i].length == 2\n0 <= start_i <= end_i <= 10^4',
        examples: [
          {
            input: 'intervals = [[1,3],[2,6],[8,10],[15,18]]',
            output: '[[1,6],[8,10],[15,18]]',
            explanation: 'Since intervals [1,3] and [2,6] overlap, merge them into [1,6].'
          }
        ],
        starterCode: {
          python: `def merge(intervals: list[list[int]]) -> list[list[int]]:\n    intervals.sort(key=lambda x: x[0])\n    merged = []\n    for interval in intervals:\n        if not merged or merged[-1][1] < interval[0]:\n            merged.append(interval)\n        else:\n            merged[-1][1] = max(merged[-1][1], interval[1])\n    return merged`,
          java: `class Solution {\n    public int[][] merge(int[][] intervals) {\n        java.util.Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));\n        java.util.List<int[]> merged = new java.util.ArrayList<>();\n        for (int[] interval : intervals) {\n            if (merged.isEmpty() || merged.get(merged.size() - 1)[1] < interval[0]) {\n                merged.add(interval);\n            } else {\n                merged.get(merged.size() - 1)[1] = Math.max(merged.get(merged.size() - 1)[1], interval[1]);\n            }\n        }\n        return merged.toArray(new int[merged.size()][]);\n    }\n}`,
          cpp: `#include <vector>\n#include <algorithm>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<vector<int>> merge(vector<vector<int>>& intervals) {\n        if (intervals.empty()) return {};\n        sort(intervals.begin(), intervals.end());\n        vector<vector<int>> merged;\n        for (auto& iv : intervals) {\n            if (merged.empty() || merged.back()[1] < iv[0]) merged.push_back(iv);\n            else merged.back()[1] = max(merged.back()[1], iv[1]);\n        }\n        return merged;\n    }\n};`,
          c: `// Standard intervals merge`
        },
        testCases: [
          { input: '[[1,3],[2,6],[8,10],[15,18]]', expectedOutput: '[[1,6],[8,10],[15,18]]', isHidden: false },
          { input: '[[1,4],[4,5]]', expectedOutput: '[[1,5]]', isHidden: false }
        ]
      }
    ],
    codingSubmissions: [
      {
        id: 'sub_001',
        userId: 'usr_alex',
        userName: 'Alex Johnson',
        problemId: 'two-sum',
        problemTitle: 'Two Sum',
        language: 'python',
        code: `def twoSum(nums, target):\n    hashmap = {}\n    for i, n in enumerate(nums):\n        if target - n in hashmap: return [hashmap[target - n], i]\n        hashmap[n] = i\n    return []`,
        status: 'Accepted',
        passedCount: 4,
        totalCount: 4,
        runtimeMs: 42,
        memoryKb: 17200,
        submittedAt: new Date(Date.now() - 86400000).toISOString(),
      }
    ],
    aptitudeAttempts: [
      {
        id: 'apt_001',
        userId: 'usr_alex',
        userName: 'Alex Johnson',
        category: 'quant',
        totalQuestions: 10,
        correctCount: 9,
        score: 90,
        timeSpentSec: 420,
        completedAt: new Date(Date.now() - 172800000).toISOString(),
      }
    ],
    mockInterviewSessions: [
      {
        id: 'mock_001',
        userId: 'usr_alex',
        userName: 'Alex Johnson',
        type: 'technical',
        jobRole: 'Frontend Engineer',
        difficulty: 'medium',
        overallScore: 84,
        summary: 'Strong grasp of React concurrency, hooks lifecycle, and state optimization. Recommended deeper exploration of network caching strategies and SSR hydration.',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      }
    ],
    resumeAnalyses: [
      {
        id: 'res_001',
        userId: 'usr_alex',
        fileName: 'Alex_Johnson_Software_Resume.pdf',
        targetRole: 'Full Stack Engineer',
        overallScore: 82,
        breakdown: {
          skillsMatch: 85,
          projectImpact: 80,
          formatting: 88,
          experience: 75,
        },
        detectedSkills: ['React', 'TypeScript', 'Node.js', 'Python', 'PostgreSQL', 'Docker', 'Git', 'REST APIs'],
        missingSkills: ['Redis', 'CI/CD Pipelines (GitHub Actions)', 'Kubernetes', 'AWS/GCP basics'],
        suggestions: [
          'Add quantifiable performance metrics to project bullet points (e.g., "Reduced latency by 32% using Redis caching").',
          'Include cloud and deployment credentials or containerization workflows.',
          'Format project headings with clear tech stack callouts.'
        ],
        analyzedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      }
    ],
    placementTrackers: [
      {
        userId: 'usr_alex',
        targetCompanies: [
          { id: 'google', name: 'Google', role: 'Software Engineer (L3)', status: 'Preparing', rounds: 'Phone Screen, Coding (2x), Googlyness' },
          { id: 'amazon', name: 'Amazon', role: 'SDE-1', status: 'Applied', rounds: 'Online Assessment, 3x Technical + LP' },
          { id: 'microsoft', name: 'Microsoft', role: 'Software Engineer', status: 'Preparing', rounds: 'OA, Technical Rounds, System Design' },
          { id: 'tcs', name: 'TCS Digital', role: 'Digital Cadre Engineer', status: 'Offer Received', rounds: 'Aptitude, Coding, Technical, HR' }
        ],
        checklist: [
          { id: 'chk-1', label: 'Complete top 50 LeetCode patterns (Arrays, DP, Graphs)', completed: true },
          { id: 'chk-2', label: 'Revise Core CS Fundamentals (DBMS, OS, Networks, OOP)', completed: true },
          { id: 'chk-3', label: 'Conduct at least 3 AI Mock Interviews with STAR responses', completed: true },
          { id: 'chk-4', label: 'Audit resume and reach ATS Score >= 80%', completed: true },
          { id: 'chk-5', label: 'Master Quantitative Aptitude timed test series', completed: false },
          { id: 'chk-6', label: 'Prepare 5 personal project stories using STAR framework', completed: false }
        ],
        weeklyGoal: {
          targetProblems: 15,
          solvedProblems: 11,
          targetMocks: 2,
          completedMocks: 1,
        },
        readinessScore: 78,
      }
    ],
    learningProgress: {
      usr_admin: {
        userId: 'usr_admin',
        totalScore: 500,
        streak: 15,
        lastActiveDate: new Date().toLocaleDateString(),
        completedLessons: ['c-pointers', 'dsa-graphs-dp', 'dbms-acid-indexing'],
        completedProblems: ['two-sum', 'valid-parentheses'],
        bookmarkedProblems: [],
      },
      usr_alex: {
        userId: 'usr_alex',
        totalScore: 420,
        streak: 6,
        lastActiveDate: new Date().toLocaleDateString(),
        completedLessons: ['c-pointers', 'python-gil-oop', 'dbms-acid-indexing', 'comm-1', 'soft-1'],
        completedProblems: ['two-sum'],
        bookmarkedProblems: ['longest-substring-without-repeating-characters'],
      }
    },
    activities: [
      {
        id: 'act_1',
        userId: 'usr_alex',
        type: 'problem_solved',
        title: 'Solved "Two Sum" with Python',
        xpEarned: 50,
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'act_2',
        userId: 'usr_alex',
        type: 'mock_interview',
        title: 'Completed Technical Mock Interview (84%)',
        xpEarned: 75,
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
      {
        id: 'act_3',
        userId: 'usr_alex',
        type: 'lesson_completed',
        title: 'Completed "DBMS ACID & Indexing" module',
        xpEarned: 30,
        timestamp: new Date(Date.now() - 3600000 * 20).toISOString(),
      }
    ]
  };
}

// --------------------------------------------------------------------------
// Database Storage Driver
// --------------------------------------------------------------------------

class Database {
  constructor() {
    this.memory = null;
    this.load();
  }

  load() {
    if (existsSync(DB_FILE)) {
      try {
        const raw = readFileSync(DB_FILE, 'utf8');
        this.memory = JSON.parse(raw);
      } catch (err) {
        console.error('[DB] Corrupted DB file, initializing clean database:', err.message);
        this.memory = createInitialData();
        this.save();
      }
    } else {
      console.log('[DB] No database found. Initializing seed data in', DB_FILE);
      this.memory = createInitialData();
      this.save();
    }
  }

  save() {
    try {
      this.memory.meta.lastSaved = new Date().toISOString();
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      writeFileSync(tempFile, JSON.stringify(this.memory, null, 2), 'utf8');
      // Atomic rename
      writeFileSync(DB_FILE, JSON.stringify(this.memory, null, 2), 'utf8');
    } catch (err) {
      console.error('[DB] Error writing to disk:', err);
    }
  }

  // Users
  getUserByEmail(email) {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    return this.memory.users.find((u) => u.email.toLowerCase() === normalized) || null;
  }

  getUserById(id) {
    return this.memory.users.find((u) => u.id === id) || null;
  }

  createUser(userData) {
    const user = {
      id: `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      name: userData.name.trim(),
      email: userData.email.trim().toLowerCase(),
      passwordHash: userData.passwordHash,
      salt: userData.salt,
      role: userData.role || 'student',
      college: userData.college || 'Engineering College',
      branch: userData.branch || 'Computer Science',
      gradYear: userData.gradYear || '2026',
      targetRole: userData.targetRole || 'Software Development Engineer',
      targetCompanies: userData.targetCompanies || ['Google', 'Microsoft', 'Amazon'],
      avatar: userData.avatar || '🎓',
      bio: userData.bio || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.memory.users.push(user);
    // Initialize default progress
    this.memory.learningProgress[user.id] = {
      userId: user.id,
      totalScore: 50, // Welcome XP
      streak: 1,
      lastActiveDate: new Date().toLocaleDateString(),
      completedLessons: [],
      completedProblems: [],
      bookmarkedProblems: [],
    };
    // Initialize default placement tracker
    this.memory.placementTrackers.push({
      userId: user.id,
      targetCompanies: [
        { id: 'google', name: 'Google', role: user.targetRole, status: 'Preparing', rounds: 'OA, 2x Coding, Behavioral' },
        { id: 'amazon', name: 'Amazon', role: user.targetRole, status: 'Preparing', rounds: 'OA, 3x Technical + LP' }
      ],
      checklist: [
        { id: 'chk-1', label: 'Revise Core Technical Topics', completed: false },
        { id: 'chk-2', label: 'Solve 20 Coding Questions', completed: false },
        { id: 'chk-3', label: 'Take Timed Aptitude Mock Test', completed: false },
        { id: 'chk-4', label: 'Complete 1 AI Mock Interview', completed: false }
      ],
      weeklyGoal: { targetProblems: 10, solvedProblems: 0, targetMocks: 1, completedMocks: 0 },
      readinessScore: 40,
    });
    this.save();
    return user;
  }

  updateUser(id, updates) {
    const idx = this.memory.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    const existing = this.memory.users[idx];
    const allowed = ['name', 'college', 'branch', 'gradYear', 'targetRole', 'targetCompanies', 'avatar', 'bio'];
    for (const key of allowed) {
      if (updates[key] !== undefined) existing[key] = updates[key];
    }
    existing.updatedAt = new Date().toISOString();
    this.memory.users[idx] = existing;
    this.save();
    return existing;
  }

  // Progress
  getProgress(userId) {
    if (!this.memory.learningProgress[userId]) {
      this.memory.learningProgress[userId] = {
        userId,
        totalScore: 0,
        streak: 1,
        lastActiveDate: new Date().toLocaleDateString(),
        completedLessons: [],
        completedProblems: [],
        bookmarkedProblems: [],
      };
      this.save();
    }
    return this.memory.learningProgress[userId];
  }

  updateProgress(userId, updates) {
    const current = this.getProgress(userId);
    if (typeof updates.totalScore === 'number') current.totalScore = updates.totalScore;
    if (typeof updates.streak === 'number') current.streak = updates.streak;
    if (Array.isArray(updates.completedLessons)) current.completedLessons = updates.completedLessons;
    if (Array.isArray(updates.completedProblems)) current.completedProblems = updates.completedProblems;
    if (Array.isArray(updates.bookmarkedProblems)) current.bookmarkedProblems = updates.bookmarkedProblems;
    current.lastActiveDate = new Date().toLocaleDateString();
    this.memory.learningProgress[userId] = current;
    this.save();
    return current;
  }

  addXp(userId, amount, reason = 'Activity completed') {
    const p = this.getProgress(userId);
    p.totalScore = (p.totalScore || 0) + amount;
    this.recordActivity(userId, 'xp_earned', `${reason} (+${amount} XP)`, amount);
    this.save();
    return p.totalScore;
  }

  recordActivity(userId, type, title, xpEarned = 0) {
    const act = {
      id: `act_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`,
      userId,
      type,
      title,
      xpEarned,
      timestamp: new Date().toISOString(),
    };
    this.memory.activities.unshift(act);
    if (this.memory.activities.length > 100) this.memory.activities.pop();
    this.save();
    return act;
  }

  getActivities(userId, limit = 10) {
    return this.memory.activities
      .filter((a) => !userId || a.userId === userId)
      .slice(0, limit);
  }

  // Technical Prep
  getTechnicalTopics(category) {
    if (!category || category === 'all') return this.memory.technicalTopics;
    return this.memory.technicalTopics.filter((t) => t.category === category);
  }

  getTechnicalTopicById(id) {
    return this.memory.technicalTopics.find((t) => t.id === id) || null;
  }

  addTechnicalTopic(topic) {
    const newTopic = {
      id: topic.id || `topic_${Date.now().toString(36)}`,
      category: topic.category || 'general',
      categoryLabel: topic.categoryLabel || 'Computer Science',
      title: topic.title,
      difficulty: topic.difficulty || 'Medium',
      readTimeMin: topic.readTimeMin || 10,
      summary: topic.summary || '',
      keyConcepts: topic.keyConcepts || [],
      codeSnippet: topic.codeSnippet || '',
      practiceQuestions: topic.practiceQuestions || [],
    };
    this.memory.technicalTopics.push(newTopic);
    this.save();
    return newTopic;
  }

  // Coding Practice
  getCodingProblems(filter = {}) {
    let list = [...this.memory.codingProblems];
    if (filter.difficulty && filter.difficulty !== 'All') {
      list = list.filter((p) => p.difficulty.toLowerCase() === filter.difficulty.toLowerCase());
    }
    if (filter.category && filter.category !== 'All') {
      list = list.filter((p) => p.category.toLowerCase().includes(filter.category.toLowerCase()));
    }
    return list;
  }

  getCodingProblemById(id) {
    return this.memory.codingProblems.find((p) => p.id === id || p.slug === id) || null;
  }

  addCodingProblem(problem) {
    const newProblem = {
      id: problem.id || problem.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: problem.title,
      slug: problem.slug || problem.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      difficulty: problem.difficulty || 'Easy',
      category: problem.category || 'Algorithms',
      description: problem.description || '',
      inputFormat: problem.inputFormat || '',
      outputFormat: problem.outputFormat || '',
      constraints: problem.constraints || '',
      examples: problem.examples || [],
      starterCode: problem.starterCode || {},
      testCases: problem.testCases || [],
    };
    this.memory.codingProblems.push(newProblem);
    this.save();
    return newProblem;
  }

  recordSubmission(sub) {
    const submission = {
      id: `sub_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`,
      userId: sub.userId,
      userName: sub.userName || 'Student',
      problemId: sub.problemId,
      problemTitle: sub.problemTitle || sub.problemId,
      language: sub.language || 'python',
      code: sub.code,
      status: sub.status,
      passedCount: sub.passedCount || 0,
      totalCount: sub.totalCount || 0,
      runtimeMs: sub.runtimeMs || Math.floor(Math.random() * 40) + 15,
      memoryKb: sub.memoryKb || 14000 + Math.floor(Math.random() * 4000),
      submittedAt: new Date().toISOString(),
    };
    this.memory.codingSubmissions.unshift(submission);
    if (this.memory.codingSubmissions.length > 200) this.memory.codingSubmissions.pop();

    if (submission.status === 'Accepted' && sub.userId) {
      const p = this.getProgress(sub.userId);
      if (!p.completedProblems.includes(sub.problemId)) {
        p.completedProblems.push(sub.problemId);
        p.totalScore += 50; // +50 XP for solving a coding problem
        this.recordActivity(sub.userId, 'problem_solved', `Accepted: ${submission.problemTitle}`, 50);
        this.save();
      }
    }
    this.save();
    return submission;
  }

  getSubmissions(userId, problemId) {
    let list = this.memory.codingSubmissions;
    if (userId) list = list.filter((s) => s.userId === userId);
    if (problemId) list = list.filter((s) => s.problemId === problemId);
    return list;
  }

  // Aptitude
  recordAptitudeAttempt(attempt) {
    const record = {
      id: `apt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`,
      userId: attempt.userId,
      userName: attempt.userName || 'Student',
      category: attempt.category || 'General Aptitude',
      totalQuestions: attempt.totalQuestions,
      correctCount: attempt.correctCount,
      score: attempt.score,
      timeSpentSec: attempt.timeSpentSec || 0,
      completedAt: new Date().toISOString(),
    };
    this.memory.aptitudeAttempts.unshift(record);
    if (attempt.userId) {
      const xp = Math.round(attempt.score * 0.5);
      this.addXp(attempt.userId, xp, `Completed Aptitude Test (${attempt.score}%)`);
    }
    this.save();
    return record;
  }

  getAptitudeAttempts(userId) {
    if (!userId) return this.memory.aptitudeAttempts;
    return this.memory.aptitudeAttempts.filter((a) => a.userId === userId);
  }

  // Mock Interviews
  recordInterviewSession(session) {
    const record = {
      id: `mock_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`,
      userId: session.userId,
      userName: session.userName || 'Student',
      type: session.type || 'technical',
      jobRole: session.jobRole || 'Software Engineer',
      difficulty: session.difficulty || 'medium',
      questionCount: session.questionCount || 5,
      overallScore: session.overallScore || 80,
      summary: session.summary || 'Mock interview completed successfully.',
      turns: session.turns || [],
      createdAt: new Date().toISOString(),
    };
    this.memory.mockInterviewSessions.unshift(record);
    if (session.userId) {
      this.addXp(session.userId, 75, `Completed ${record.type} mock interview`);
    }
    this.save();
    return record;
  }

  getInterviewSessions(userId) {
    if (!userId) return this.memory.mockInterviewSessions;
    return this.memory.mockInterviewSessions.filter((s) => s.userId === userId);
  }

  // Resume Analyses
  recordResumeAnalysis(analysis) {
    const record = {
      id: `res_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`,
      userId: analysis.userId,
      fileName: analysis.fileName || 'Resume.pdf',
      targetRole: analysis.targetRole || 'Software Engineer',
      overallScore: analysis.overallScore,
      breakdown: analysis.breakdown,
      detectedSkills: analysis.detectedSkills || [],
      missingSkills: analysis.missingSkills || [],
      suggestions: analysis.suggestions || [],
      analyzedAt: new Date().toISOString(),
    };
    this.memory.resumeAnalyses.unshift(record);
    if (analysis.userId) {
      this.addXp(analysis.userId, 25, 'Analyzed Resume');
    }
    this.save();
    return record;
  }

  getResumeAnalyses(userId) {
    if (!userId) return this.memory.resumeAnalyses;
    return this.memory.resumeAnalyses.filter((r) => r.userId === userId);
  }

  // Placement Readiness
  getPlacementTracker(userId) {
    let tracker = this.memory.placementTrackers.find((t) => t.userId === userId);
    if (!tracker) {
      tracker = {
        userId,
        targetCompanies: [
          { id: 'google', name: 'Google', role: 'Software Engineer', status: 'Preparing', rounds: 'OA, Coding (2x), Behavioral' },
          { id: 'microsoft', name: 'Microsoft', role: 'Software Engineer', status: 'Preparing', rounds: 'OA, Technical Rounds' }
        ],
        checklist: [
          { id: 'chk-1', label: 'Revise Core Technical Topics', completed: false },
          { id: 'chk-2', label: 'Solve 20 Coding Questions', completed: false },
          { id: 'chk-3', label: 'Take Timed Aptitude Mock Test', completed: false }
        ],
        weeklyGoal: { targetProblems: 10, solvedProblems: 0, targetMocks: 1, completedMocks: 0 },
        readinessScore: 50,
      };
      this.memory.placementTrackers.push(tracker);
      this.save();
    }
    return tracker;
  }

  updatePlacementTracker(userId, updates) {
    const idx = this.memory.placementTrackers.findIndex((t) => t.userId === userId);
    if (idx === -1) {
      const created = { userId, ...updates };
      this.memory.placementTrackers.push(created);
      this.save();
      return created;
    }
    const current = this.memory.placementTrackers[idx];
    if (updates.targetCompanies) current.targetCompanies = updates.targetCompanies;
    if (updates.checklist) current.checklist = updates.checklist;
    if (updates.weeklyGoal) current.weeklyGoal = updates.weeklyGoal;
    if (typeof updates.readinessScore === 'number') current.readinessScore = updates.readinessScore;
    this.memory.placementTrackers[idx] = current;
    this.save();
    return current;
  }

  // Admin stats
  getAdminStats() {
    const usersCount = this.memory.users.length;
    const problemsCount = this.memory.codingProblems.length;
    const submissionsCount = this.memory.codingSubmissions.length;
    const interviewsCount = this.memory.mockInterviewSessions.length;
    const aptitudeAttemptsCount = this.memory.aptitudeAttempts.length;
    const resumesCount = this.memory.resumeAnalyses.length;

    const acceptedSubmissions = this.memory.codingSubmissions.filter((s) => s.status === 'Accepted').length;
    const acceptanceRate = submissionsCount > 0 ? Math.round((acceptedSubmissions / submissionsCount) * 100) : 0;

    return {
      usersCount,
      problemsCount,
      submissionsCount,
      interviewsCount,
      aptitudeAttemptsCount,
      resumesCount,
      acceptanceRate,
      recentUsers: this.memory.users.slice(0, 10).map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        college: u.college,
        targetRole: u.targetRole,
        createdAt: u.createdAt,
      })),
      recentSubmissions: this.memory.codingSubmissions.slice(0, 8),
      recentInterviews: this.memory.mockInterviewSessions.slice(0, 8),
    };
  }
}

export const db = new Database();

