import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class XacThucService {
  private readonly supabase: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY');
    }
    this.supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }

  async dangKy(email: string, matKhau: string) {
    const { data, error } = await this.supabase.auth.signUp({ email, password: matKhau });
    if (error) {
      if (error.status === 429) throw new ServiceUnavailableException('Vui lòng thử lại sau');
      throw new BadRequestException('Không thể đăng ký. Hãy kiểm tra email và mật khẩu');
    }
    return {
      thong_bao: 'Nếu đăng ký hợp lệ, hãy kiểm tra email để xác nhận tài khoản',
      can_xac_nhan_email: !data.session,
    };
  }

  async dangNhap(email: string, matKhau: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password: matKhau });
    if (error || !data.session) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng, hoặc tài khoản chưa được xác nhận');
    }
    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
      nguoi_dung: { id: data.user.id, email: data.user.email },
    };
  }

  async xacMinhToken(token: string) {
    const { data, error } = await this.supabase.auth.getUser(token);
    if (error || !data.user) throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
    return { id: data.user.id, email: data.user.email };
  }
}
