import { Module } from '@nestjs/common';
import { FaceClientService } from './face-client.service';
import { StudentFaceEmbeddingService } from './student-face-embedding.service';

@Module({
  providers: [FaceClientService, StudentFaceEmbeddingService],
  exports: [FaceClientService, StudentFaceEmbeddingService],
})
export class FaceModule {}
