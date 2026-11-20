import { randomUUID } from "node:crypto";
import type { EmailStatus, Enquiry } from "./enquiry.js";

export interface EnquiryRepository {
  create(enquiry: Omit<Enquiry, "id">): Promise<Enquiry>;
  setEmailStatus(id: string, status: EmailStatus): Promise<void>;
}

export class InMemoryEnquiryRepository implements EnquiryRepository {
  readonly enquiries: Enquiry[] = [];

  async create(enquiry: Omit<Enquiry, "id">): Promise<Enquiry> {
    const saved = { ...enquiry, id: randomUUID() };
    this.enquiries.push(saved);
    return saved;
  }

  async setEmailStatus(id: string, status: EmailStatus): Promise<void> {
    const enquiry = this.enquiries.find((e) => e.id === id);
    if (enquiry) enquiry.emailStatus = status;
  }
}
