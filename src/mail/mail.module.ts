import { DynamicModule, Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { CONFIG_OPTIONS } from '../common/commom.constants';
import { MailModuleOptions } from './mail.interface';

@Module({})
@Global()
export class MailModule {
  static forRoot(options: MailModuleOptions): DynamicModule {
    return {
      module: MailModule,
      providers: [
        {
          provide: CONFIG_OPTIONS,
          useValue: options,
        },
        MailService,
      ],
      exports: [MailService],
    };
  }
}
