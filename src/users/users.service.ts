import { Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateAccountInput,
  CreateAccountOutput,
} from './dtos/create-account.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async createAccount({
    email,
    password,
    role,
  }: CreateAccountInput): Promise<CreateAccountOutput> {
    try {
      // 새로운 user 인지 확인
      const exists = await this.users.findOneBy({ email });
      if (exists) {
        return {
          error: '이미 가입된 이메일입니다.',
          ok: false,
        };
      }
      // 비밀번호를 해싱하는 로직은 entity 안에 method 로 넣고,
      // typeOrm listener @BeforeInsert 를 통해 저장전에 해싱된다.
      await this.users.save(this.users.create({ email, password, role }));
      return {
        ok: true,
      };
    } catch {
      return {
        error: '새로운 계정 만들기에 실패했습니다.',
        ok: false,
      };
    }
  }
}
