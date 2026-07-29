import { Injectable, Logger } from '@nestjs/common';

export type FacePrototype = { id: string; embedding: number[] };

@Injectable()
export class FaceClientService {
  private readonly logger = new Logger(FaceClientService.name);
  private readonly baseUrl: string | null;

  constructor() {
    const raw = process.env.FACE_SERVICE_URL?.trim();
    this.baseUrl = raw ? raw.replace(/\/$/, '') : null;
  }

  isEnabled(): boolean {
    return this.baseUrl !== null;
  }

  /** Cosine similarity threshold for L2-normalized InsightFace embeddings (~0.35–0.55). */
  getMatchThreshold(): number {
    const t = Number.parseFloat(process.env.FACE_MATCH_THRESHOLD ?? '0.45');
    return Number.isFinite(t) ? t : 0.45;
  }

  async embedOneFace(image: Buffer): Promise<number[] | null> {
    if (!this.baseUrl) {
      return null;
    }
    const form = new FormData();
    form.append('image', new Blob([new Uint8Array(image)]), 'photo.jpg');
    const res = await fetch(`${this.baseUrl}/v1/embed`, { method: 'POST', body: form });
    const text = await res.text();
    if (res.status === 400) {
      this.logger.warn(`Face embed rejected: ${text}`);
      return null;
    }
    if (!res.ok) {
      throw new Error(`Face embed HTTP ${res.status}: ${text}`);
    }
    const data = JSON.parse(text) as { embedding?: number[] };
    return Array.isArray(data.embedding) ? data.embedding : null;
  }

  async matchAudience(
    image: Buffer,
    prototypes: FacePrototype[],
    threshold: number,
  ): Promise<{ id: string; confidence: number }[]> {
    if (!this.baseUrl) {
      throw new Error('Face service URL not configured');
    }
    const form = new FormData();
    form.append('image', new Blob([new Uint8Array(image)]), 'audience.jpg');
    form.append('meta', JSON.stringify({ prototypes, threshold }));
    const res = await fetch(`${this.baseUrl}/v1/match`, { method: 'POST', body: form });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(summarizeFaceHttpError(res.status, text));
    }
    const data = JSON.parse(text) as { matches?: { id: string; confidence: number }[] };
    if (!Array.isArray(data.matches)) {
      return [];
    }
    return data.matches.map((m) => ({
      id: m.id,
      confidence: typeof m.confidence === 'number' ? m.confidence : Number(m.confidence),
    }));
  }
}

function summarizeFaceHttpError(status: number, body: string): string {
  if (body.length > 280) {
    return `Face match HTTP ${status}: ${body.slice(0, 280)}…`;
  }
  return `Face match HTTP ${status}: ${body}`;
}
