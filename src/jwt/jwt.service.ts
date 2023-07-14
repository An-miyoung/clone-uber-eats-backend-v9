import { Inject, Injectable } from '@nestjs/common';
import { JwtModuleOptions } from './jwt.interface';
import { CONFIG_OPTIONS } from '../common/commom.constants';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: JwtModuleOptions,
  ) {}
  secretKey = Buffer.from(this.options.privateKey, 'base64');

  sign(userId: number): string {
    return jwt.sign({ id: userId }, this.secretKey);
  }

  verify(token: string) {
    return jwt.verify(token, this.secretKey);
  }
}
