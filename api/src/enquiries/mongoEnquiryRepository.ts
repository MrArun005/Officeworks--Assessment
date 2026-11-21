import { ObjectId, type Collection, type Db } from "mongodb";
import type { EmailStatus, Enquiry } from "./enquiry.js";
import type { EnquiryRepository } from "./enquiryRepository.js";

type EnquiryDoc = Omit<Enquiry, "id">;

export class MongoEnquiryRepository implements EnquiryRepository {
  private readonly enquiries: Collection<EnquiryDoc>;

  constructor(db: Db) {
    this.enquiries = db.collection<EnquiryDoc>("enquiries");
  }

  async create(enquiry: Omit<Enquiry, "id">): Promise<Enquiry> {
    // Copy first: the driver adds `_id` to the object it is given.
    const { insertedId } = await this.enquiries.insertOne({ ...enquiry });
    return { ...enquiry, id: insertedId.toHexString() };
  }

  async setEmailStatus(id: string, status: EmailStatus): Promise<void> {
    await this.enquiries.updateOne(
      { _id: new ObjectId(id) },
      { $set: { emailStatus: status } },
    );
  }
}
