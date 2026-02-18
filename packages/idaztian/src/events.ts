/**
 * Typed event emitter for IdaztianEditor
 */

export type IdaztianEventMap = {
    change: [content: string];
    save: [content: string];
    selectionChange: [selection: { from: number; to: number; text: string }];
    focus: [];
    blur: [];
    ready: [];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (...args: any[]) => void;

export class EventEmitter {
    private handlers: Partial<Record<keyof IdaztianEventMap, Set<AnyHandler>>> = {};

    on<K extends keyof IdaztianEventMap>(
        event: K,
        handler: (...args: IdaztianEventMap[K]) => void
    ): this {
        if (!this.handlers[event]) {
            this.handlers[event] = new Set();
        }
        this.handlers[event]!.add(handler as AnyHandler);
        return this;
    }

    off<K extends keyof IdaztianEventMap>(
        event: K,
        handler: (...args: IdaztianEventMap[K]) => void
    ): this {
        this.handlers[event]?.delete(handler as AnyHandler);
        return this;
    }

    emit<K extends keyof IdaztianEventMap>(
        event: K,
        ...args: IdaztianEventMap[K]
    ): void {
        this.handlers[event]?.forEach((handler) => handler(...args));
    }

    removeAllListeners(event?: keyof IdaztianEventMap): void {
        if (event) {
            delete this.handlers[event];
        } else {
            this.handlers = {};
        }
    }
}
