const $length = Symbol();

export class Queue {
    constructor() {
        this[$length] = 0;
        this.root = new Node(null);
        this.last = this.root;
    }

    get length() { return this[$length]; }

    enqueue(value) {
        this.last.next = new Node(value);
        this.last = this.last.next;
        this[$length]++;
    }

    dequeue() {
        if (this[$length] === 0) {
            return undefined;
        }

        this[$length]--;
        const firstNode = this.root.next;
        this.root.next = this.root.next.next;
        return firstNode.value;
    }

    insertFirst(value) {
        const node = new Node(value);
        node.next = this.root.next;
        this.root.next = node;
        this[$length]++;
        if (this.length === 1) {
            this.last = node;
        }
    }

    find(action) {
        const node = this.root.next;
        while (node !== null) {
            if (action(node.value)) {
                return value;
            }
        }

        return undefined;
    }
}

function Node(value) {
    this.next = null;
    this.value = value;
}