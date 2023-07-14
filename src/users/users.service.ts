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
import { Verification } from './entities/verification.entity';
import { VerifyEmailInput, VerifyEmailOutput } from './dtos/verify-email.dto';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Verification)
    private readonly verifications: Repository<Verification>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
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
      const user = await this.users.save(
        this.users.create({ email, password, role }),
      );
      // email verification 생성
      const verification = await this.verifications.save(
        this.verifications.create({ user }),
      );
      this.mailService.sendVerficationEmail(
        verification.code,
        user.email,
        'verify-email',
      );
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
      const user = await this.users.findOne({
        where: { email },
        // entity 선언과 상관없이 select 한 필드만 불러온다. token 을 만들때 id 는 필수
        select: ['id', 'password'],
      });
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
      const token = this.jwtService.sign(user.id);
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
      // @UseGuard 를 통해 인증이 끝났기 때문에 비밀번호를 불러오지 않아도 된다.
      // 만약 비번을 고칠때 과거 비번체크를 한다면
      // findOne({ where: { id: userId },select: ['id', 'password']})
      // 사용해 읽어들여야 한다.
      const user = await this.users.findOneBy({ id: userId });
      if (email) {
        user.email = email;
        user.verified = false;
        // this.verifications.delete(verification.id) 로 삭제할 수 있지만,
        // 유저아이디에 연결된 verification 을 삭제 하는 방법이 더 바람직.
        this.verifications.delete({ user: { id: userId } });
        const verification = await this.verifications.save(
          this.verifications.create({ user }),
        );
        this.mailService.sendVerficationEmail(
          verification.code,
          user.email,
          'change-email',
        );
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

  // verification repo 에 코드가 있다면 연결된 유저의 verified 를 true 로 바꿔서 저장하는 함수
  async verifyEmail({ code }: VerifyEmailInput): Promise<VerifyEmailOutput> {
    try {
      const verification = await this.verifications.findOne({
        where: { code },
        // userId 만 필요하다면 loadRelationIds: true
        relations: ['user'],
      });
      if (verification) {
        verification.user.verified = true;
        await this.users.save(verification.user);
      }
      return {
        ok: true,
      };
    } catch {
      return {
        error: '이메일인증에 실패했습니다.',
        ok: false,
      };
    }
  }
}
