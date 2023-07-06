import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import {
  CreateAccountInput,
  CreateAccountOutput,
} from './dtos/create-account.dto';
import { LoginInput, LoginOutput } from './dtos/login.dto';
import { JwtService } from 'src/jwt/jwt.service';
import { UserProfileInput, UserProfileOutput } from './dtos/user-profile.dto';
import { EditProfileInput, EditProfileOutput } from './dtos/edit-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwtService: JwtService,
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

  async login({ email, password }: LoginInput): Promise<LoginOutput> {
    try {
      // 1. email user 첮기
      const user = await this.users.findOneBy({ email });
      if (!user) {
        return {
          error: '가입하지 않은 이메일입니다.',
          ok: false,
        };
      }
      // 2. 비밀번호를 가져와서 입력된 비밀번호와 맞는지 확인
      const passwordCorrect = await user.checkPassword(password);
      if (!passwordCorrect) {
        return {
          error: '비밀번호가 다릅니다.',
          ok: false,
        };
      }
      // 3. token 발행
      const token = this.jwtService.sign({ id: user.id });
      return {
        ok: true,
        token,
      };
    } catch {
      return {
        error: '로그인에 실패했습니다.',
        ok: false,
      };
    }
  }

  async findById(id: number): Promise<User> {
    return await this.users.findOneBy({ id });
  }

  async userProfile({ userId }: UserProfileInput): Promise<UserProfileOutput> {
    try {
      const user = await this.users.findOneBy({ id: userId });
      if (!user) {
        return {
          error: '사용자가 존재하지 않습니다.',
          ok: false,
        };
      }
      return {
        ok: true,
        user,
      };
    } catch {
      return {
        error: '사용자 계정 읽어오기에 실패했습니다.',
        ok: false,
      };
    }
  }

  async editProfile(
    userId: number,
    { email, password }: EditProfileInput,
  ): Promise<EditProfileOutput> {
    try {
      const user = await this.users.findOneBy({ id: userId });
      if (email) {
        user.email = email;
      }
      if (password) {
        user.password = password;
      }
      await this.users.save(user);
      return {
        ok: true,
      };
    } catch {
      return {
        error: '사용자 계정 수정에 실패했습니다.',
        ok: false,
      };
    }
  }
}
