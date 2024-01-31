import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { createMock } from '@golevelup/ts-jest';
import { Request } from 'express';
import { AuthError } from './errors/auth.error';

const fakeUsers = [
  {
    id: 1,
    email: 'test@mail.com',
    password: 'Password123!',
    fullName: 'Test User',
    emailHash: 'emailHash',
    emailVerified: false,
    refreshToken: 'refreshToken',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const serviceMock = {
  signUp: jest.fn().mockResolvedValue(fakeUsers[0]),
  confirmEmail: jest.fn().mockResolvedValue(fakeUsers[0]),
  resendConfirmationEmail: jest.fn().mockResolvedValue(fakeUsers[0]),
  login: jest.fn().mockResolvedValue({ token: 'token' }),
  refreshTokens: jest.fn().mockResolvedValue({ token: 'newToken' }),
  logout: jest.fn().mockResolvedValue('Logout success'),
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: serviceMock }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('signUp', () => {
    it('should call authService.signUp and return success message', async () => {
      const signUpDto = new SignUpDto();

      const result = await controller.signUp(signUpDto);

      expect(authService.signUp).toHaveBeenCalledWith(signUpDto);
      expect(result).toBe(
        'Sign up completed. An email was sent to you to confirm your email address',
      );
    });

    it('should throw BadRequestException if AuthError occurs', async () => {
      const signUpDto = new SignUpDto();

      jest
        .spyOn(authService, 'signUp')
        .mockRejectedValueOnce(new AuthError('AuthError message'));

      expect(authService.signUp).toHaveBeenCalledWith(signUpDto);
      await expect(controller.signUp(signUpDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if any other error occurs', async () => {
      const signUpDto = new SignUpDto();
      const errorMessage = 'Some other error message';

      jest
        .spyOn(authService, 'signUp')
        .mockRejectedValueOnce(new Error(errorMessage));

      expect(authService.signUp).toHaveBeenCalledWith(signUpDto);
      await expect(controller.signUp(signUpDto)).rejects.toThrow(errorMessage);
    });
  });

  describe('confirmEmail', () => {
    it('should call authService.confirmEmail and return "Email confirmed"', async () => {
      const token = 'testToken';

      const result = await controller.confirmEmail(token);

      expect(authService.confirmEmail).toHaveBeenCalledWith(token);
      expect(result).toBe('Email confirmed');
    });

    it('should throw NotFoundException if AuthError occurs', async () => {
      const token = 'testToken';

      jest
        .spyOn(authService, 'confirmEmail')
        .mockRejectedValueOnce(new AuthError('AuthError message'));

      expect(authService.confirmEmail).toHaveBeenCalledWith(token);
      await expect(controller.confirmEmail(token)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error if any other error occurs', async () => {
      const token = 'testToken';
      const errorMessage = 'Some other error message';

      jest
        .spyOn(authService, 'confirmEmail')
        .mockRejectedValueOnce(new Error(errorMessage));

      expect(authService.confirmEmail).toHaveBeenCalledWith(token);
      await expect(controller.confirmEmail(token)).rejects.toThrow(
        errorMessage,
      );
    });
  });

  describe('resendConfirmationEmail', () => {
    it('should call authService.resendConfirmationEmail and return "Email sent"', async () => {
      const loginDto = new LoginDto();
      loginDto.email = 'test@mail.com';
      loginDto.password = 'Password123!';

      const result = await controller.resendConfirmationEmail(loginDto);

      expect(authService.resendConfirmationEmail).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(result).toBe('Email sent');
    });

    it('should throw NotFoundException if AuthError occurs', async () => {
      const loginDto = new LoginDto();
      loginDto.email = 'test@mail.com';
      loginDto.password = 'Password123!';

      jest
        .spyOn(authService, 'resendConfirmationEmail')
        .mockRejectedValueOnce(new AuthError('AuthError message'));

      expect(authService.resendConfirmationEmail).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      await expect(
        controller.resendConfirmationEmail(loginDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if any other error occurs', async () => {
      const loginDto = new LoginDto();
      loginDto.email = 'test@mail.com';
      loginDto.password = 'Password123!';
      const errorMessage = 'Some other error message';

      jest
        .spyOn(authService, 'resendConfirmationEmail')
        .mockRejectedValueOnce(new Error(errorMessage));

      expect(authService.resendConfirmationEmail).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      await expect(
        controller.resendConfirmationEmail(loginDto),
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('login', () => {
    it('should call authService.login and return the result', async () => {
      const loginDto = new LoginDto();
      loginDto.email = 'test@mail.com';
      loginDto.password = 'Password123!';

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(result).toStrictEqual({ token: 'token' });
    });

    it('should throw UnauthorizedException if AuthError occurs', async () => {
      const loginDto = new LoginDto();
      loginDto.email = 'test@mail.com';
      loginDto.password = 'Password123!';

      jest
        .spyOn(authService, 'login')
        .mockRejectedValueOnce(new AuthError('AuthError message'));

      expect(authService.login).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw error if any other error occurs', async () => {
      const loginDto = new LoginDto();
      loginDto.email = 'test@mail.com';
      loginDto.password = 'Password123!';
      const errorMessage = 'Some other error message';

      jest
        .spyOn(authService, 'login')
        .mockRejectedValueOnce(new Error(errorMessage));

      expect(authService.login).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      await expect(controller.login(loginDto)).rejects.toThrow(errorMessage);
    });
  });

  describe('refreshToken', () => {
    it('should call authService.refreshTokens and return the result', async () => {
      const request = createMock<Request>({
        user: {
          sub: 1,
          refreshToken: 'refreshToken',
        },
      });

      const result = await controller.refreshToken(request);

      expect(authService.refreshTokens).toHaveBeenCalledWith(1, 'refreshToken');
      expect(result).toStrictEqual({ token: 'newToken' });
    });

    it('should throw UnauthorizedException if AuthError occurs', async () => {
      const request = createMock<Request>({
        user: {
          sub: 1,
          refreshToken: 'refreshToken',
        },
      });
      jest
        .spyOn(authService, 'refreshTokens')
        .mockRejectedValueOnce(new AuthError('AuthError message'));

      expect(authService.refreshTokens).toHaveBeenCalledWith(1, 'refreshToken');
      await expect(controller.refreshToken(request)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw error if any other error occurs', async () => {
      const request = createMock<Request>({
        user: {
          sub: 1,
          refreshToken: 'refreshToken',
        },
      });
      const errorMessage = 'Some other error message';

      jest
        .spyOn(authService, 'refreshTokens')
        .mockRejectedValueOnce(new Error(errorMessage));

      expect(authService.refreshTokens).toHaveBeenCalledWith(1, 'refreshToken');
      await expect(controller.refreshToken(request)).rejects.toThrow(
        errorMessage,
      );
    });
  });

  describe('logout', () => {
    it('should call authService.logout and return "Logout success"', async () => {
      const request = createMock<Request>({
        user: {
          sub: 1,
        },
      });

      const result = await controller.logout(request);

      expect(authService.logout).toHaveBeenCalledWith(1);
      expect(result).toBe('Logout success');
    });

    it('should throw UnauthorizedException if user is not provided', async () => {
      const request = createMock<Request>({
        user: null,
      });

      await expect(controller.logout(request)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException if AuthError occurs', async () => {
      const request = createMock<Request>({
        user: {
          sub: 1,
        },
      });

      jest
        .spyOn(authService, 'logout')
        .mockRejectedValueOnce(new AuthError('AuthError message'));

      expect(authService.logout).toHaveBeenCalledWith(1);
      await expect(controller.logout(request)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if any other error occurs', async () => {
      const request = createMock<Request>({
        user: {
          sub: 1,
        },
      });
      const errorMessage = 'Some other error message';

      jest
        .spyOn(authService, 'logout')
        .mockRejectedValueOnce(new Error(errorMessage));

      expect(authService.logout).toHaveBeenCalledWith(1);
      await expect(controller.logout(request)).rejects.toThrow(errorMessage);
    });
  });
});
