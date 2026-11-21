/** Where the owner's hand-picked "top rated" product ids live. */
export interface FeaturedStore {
  /** Ordered ids; empty when nothing has been chosen yet. */
  getIds(): Promise<string[]>;
  setIds(ids: string[]): Promise<void>;
}

export class InMemoryFeaturedStore implements FeaturedStore {
  constructor(private ids: string[] = []) {}

  async getIds(): Promise<string[]> {
    return [...this.ids];
  }

  async setIds(ids: string[]): Promise<void> {
    this.ids = [...ids];
  }
}
