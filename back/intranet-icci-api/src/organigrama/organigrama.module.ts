import { Module } from '@nestjs/common';
import { OrganigramaService } from './organigrama.service';
import { OrganigramaController } from './organigrama.controller';

@Module({
  providers: [OrganigramaService],
  controllers: [OrganigramaController]
})
export class OrganigramaModule {}
