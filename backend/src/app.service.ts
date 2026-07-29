import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  listPublicGroups() {
    return this.prisma.group.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}
