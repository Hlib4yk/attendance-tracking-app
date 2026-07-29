import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /** For registration form: pick a student group */
  @Get('groups')
  listGroups() {
    return this.appService.listPublicGroups();
  }
}
