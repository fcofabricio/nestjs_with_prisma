import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailerService } from '@nestjs-modules/mailer';
import { SignUpDto } from './dto/signup.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserServiceError } from 'src/users/errors/users.service.error';
import { AuthError } from './errors/auth.error';
import * as bcrypt from 'bcrypt';

const signUpDto: SignUpDto = {
  email: 'test@example.com',
  fullName: 'John Doe',
  password: 'password123',
};

const fakeUser = {
  id: 1,
  email: signUpDto.email,
  password: '1234567890',
  fullName: signUpDto.fullName,
  emailHash: 'emailHash',
  emailVerified: false,
  refreshToken: 'refreshToken',
  createdAt: new Date(),
  updatedAt: new Date(),
};
const userServiceMock = {
  create: jest.fn().mockResolvedValue(fakeUser),
  findOneByEmailHash: jest.fn().mockResolvedValue(fakeUser),
  findOneByEmail: jest.fn().mockResolvedValue(fakeUser),
  update: jest.fn().mockResolvedValue(fakeUser),
};

const mailerServiceMock = {
  sendMail: jest.fn(),
};

const mail = {
  to: fakeUser.email,
  from: 'noreply@application.com',
  subject: 'Email de confirmação',
  template: 'email-confirmation',
  context: {
    token: fakeUser.emailHash,
  },
};

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let mailerService: MailerService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: userServiceMock },
        { provide: MailerService, useValue: mailerServiceMock },
        JwtService,
        ConfigService,
      ],
    }).compile();

    authService = moduleRef.get<AuthService>(AuthService);
    usersService = moduleRef.get<UsersService>(UsersService);
    mailerService = moduleRef.get<MailerService>(MailerService);
    jwtService = moduleRef.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should create a new user and return it', async () => {
      const result = await authService.signUp(signUpDto);

      expect(usersService.create).toHaveBeenCalledWith({
        email: signUpDto.email,
        fullName: signUpDto.fullName,
        password: expect.any(String),
      });
      expect(mailerService.sendMail).toHaveBeenCalledWith(mail);
      expect(result).toEqual(fakeUser);
    });

    it('should throw an AuthError if UserServiceError is thrown', async () => {
      jest
        .spyOn(usersService, 'create')
        .mockRejectedValue(new UserServiceError('User service error'));

      await expect(authService.signUp(signUpDto)).rejects.toThrow(
        new AuthError('User service error'),
      );
    });

    it('should re-throw the error if it is not a UserServiceError', async () => {
      const otherError = new Error('Some other error');

      jest.spyOn(usersService, 'create').mockRejectedValue(otherError);

      await expect(authService.signUp(signUpDto)).rejects.toThrow(otherError);
    });
  });

  describe('confirmEmail', () => {
    it('should confirm the email of a user', async () => {
      const hash = 'emailHash';

      const result = await authService.confirmEmail(hash);

      expect(usersService.findOneByEmailHash).toHaveBeenCalledWith(hash);
      expect(usersService.update).toHaveBeenCalledWith(fakeUser.id, {
        emailVerified: true,
      });
      expect(result).toEqual(fakeUser);
    });

    it('should throw an AuthError if user is not found', async () => {
      const hash = 'emailHash';

      jest.spyOn(usersService, 'findOneByEmailHash').mockResolvedValue(null);

      await expect(authService.confirmEmail(hash)).rejects.toThrow(
        new AuthError('User no found to confirm email'),
      );
    });
  });

  describe('resendConfirmationEmail', () => {
    it('should resend confirmation email for a user', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      jest.spyOn(bcrypt, 'compareSync').mockReturnValue(true);

      await expect(
        authService.resendConfirmationEmail(email, password),
      ).resolves.toBeUndefined();

      expect(usersService.findOneByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.compareSync).toHaveBeenCalledWith(
        password,
        fakeUser.password,
      );
      expect(mailerService.sendMail).toHaveBeenCalledWith(mail);
    });

    it('should throw an AuthError if email is invalid', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      jest.spyOn(usersService, 'findOneByEmail').mockResolvedValue(null);

      await expect(
        authService.resendConfirmationEmail(email, password),
      ).rejects.toThrow(new AuthError('Invalid email or password'));
    });

    it('should throw an AuthError if password is invalid', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      jest.spyOn(bcrypt, 'compareSync').mockReturnValue(false);

      await expect(
        authService.resendConfirmationEmail(email, password),
      ).rejects.toThrow(new AuthError('Invalid email or password'));
    });

    it('should throw an AuthError if email is already verified', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      jest
        .spyOn(usersService, 'findOneByEmail')
        .mockResolvedValue({ ...fakeUser, emailVerified: true });

      jest.spyOn(bcrypt, 'compareSync').mockReturnValue(true);

      await expect(
        authService.resendConfirmationEmail(email, password),
      ).rejects.toThrow(new AuthError('Already verified email'));
    });
  });

  describe('login', () => {
    it('should return tokens if email and password are valid and email is verified', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      jest
        .spyOn(usersService, 'findOneByEmail')
        .mockResolvedValue({ ...fakeUser, emailVerified: true });
      jest.spyOn(bcrypt, 'compareSync').mockReturnValue(true);

      const result = await authService.login(email, password);

      expect(usersService.findOneByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.compareSync).toHaveBeenCalledWith(
        password,
        fakeUser.password,
      );
      expect(usersService.update).toHaveBeenCalledWith(fakeUser.id, {
        refreshToken: expect.any(String),
      });

      const accessToken = jwtService.decode(result.accessToken) as any;

      expect(accessToken.sub).toEqual(fakeUser.id);
      expect(accessToken.username).toEqual(fakeUser.email);
      expect(accessToken.iat).toEqual(expect.any(Number));
      expect(accessToken.exp).toEqual(expect.any(Number));

      const refreshToken = jwtService.decode(result.refreshToken) as any;

      expect(refreshToken.sub).toEqual(fakeUser.id);
      expect(refreshToken.username).toEqual(fakeUser.email);
      expect(refreshToken.iat).toEqual(expect.any(Number));
      expect(refreshToken.exp).toEqual(expect.any(Number));
    });

    it('should throw an AuthError if email is invalid', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      jest.spyOn(usersService, 'findOneByEmail').mockResolvedValue(null);
      jest.spyOn(bcrypt, 'compareSync').mockReturnValue(true);

      await expect(authService.login(email, password)).rejects.toThrow(
        new AuthError('Invalid email or password'),
      );

      expect(usersService.findOneByEmail).toHaveBeenCalledWith(email);
    });

    it('should throw an AuthError if password is invalid', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      jest.spyOn(usersService, 'findOneByEmail').mockResolvedValue(fakeUser);
      jest.spyOn(bcrypt, 'compareSync').mockReturnValue(false);

      await expect(authService.login(email, password)).rejects.toThrow(
        new AuthError('Invalid email or password'),
      );

      expect(usersService.findOneByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.compareSync).toHaveBeenCalledWith(
        password,
        fakeUser.password,
      );
    });

    it('should throw an AuthError if email is not verified', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      jest.spyOn(usersService, 'findOneByEmail').mockResolvedValue(fakeUser);
      jest.spyOn(bcrypt, 'compareSync').mockReturnValue(true);

      await expect(authService.login(email, password)).rejects.toThrow(
        new AuthError('Not verified email'),
      );

      expect(usersService.findOneByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.compareSync).toHaveBeenCalledWith(
        password,
        fakeUser.password,
      );
    });
  });
});
