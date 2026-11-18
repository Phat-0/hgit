import {moDb} from '../quan-tri/van-hanh.db.js';
import {isIP} from 'node:net';
import {GioiHanTruyCapService} from './gioi-han.service.js';
import {chuanHoaSoDienThoai} from './so-dien-thoai.js';
import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class XacThucService {
  private readonly supabase: SupabaseClient;

  constructor(private readonly limiter:GioiHanTruyCapService) {
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

  async guiOtpDienThoai(phone:string){phone=chuanHoaSoDienThoai(phone);await this.limiter.limit(phone,'otp-phone',3,600);const {error}=await this.supabase.auth.signInWithOtp({phone,options:{shouldCreateUser:true}});if(error)throw new BadRequestException('Không gửi được OTP. Kiểm tra cấu hình Phone Auth/SMS và số điện thoại');return {thong_bao:'Nếu số điện thoại hợp lệ, mã OTP sẽ được gửi đến số này'};}

  async xacMinhOtpDienThoai(phone:string,otp:string){phone=chuanHoaSoDienThoai(phone);await this.limiter.limit(phone,'verify-phone',10,600);const {data,error}=await this.supabase.auth.verifyOtp({phone,token:otp,type:'sms'});if(error||!data.session||!data.user)throw new UnauthorizedException('Mã OTP không đúng hoặc đã hết hạn');return {access_token:data.session.access_token,refresh_token:data.session.refresh_token,expires_in:data.session.expires_in,nguoi_dung:{id:data.user.id,phone:data.user.phone}};}

  async dangNhap(email: string, matKhau: string, ip?:string, device?:string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password: matKhau });
    if (error || !data.session) {
      await this.ghiDangNhap(null,'Thất bại',ip,device);
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng, hoặc tài khoản chưa được xác nhận');
    }
    await this.ghiDangNhap(data.user.id,'Thành công',ip,device);
    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
      nguoi_dung: { id: data.user.id, email: data.user.email },
    };
  }

  async lamMoi(refreshToken: string) {
    const {data,error}=await this.supabase.auth.refreshSession({refresh_token:refreshToken});
    if(error||!data.session||!data.user)throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    return {access_token:data.session.access_token,refresh_token:data.session.refresh_token,expires_in:data.session.expires_in,nguoi_dung:{id:data.user.id,email:data.user.email}};
  }

  async xacMinhToken(token: string) {
    const { data, error } = await this.supabase.auth.getUser(token);
    if (error || !data.user) throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
    return { id: data.user.id, email: data.user.email,phone:data.user.phone,phone_verified:!!data.user.phone_confirmed_at };
  }
  private async ghiDangNhap(uid:string|null,result:string,ip?:string,device?:string){try{const c=await moDb();try{if(uid)await c.query('INSERT INTO public.nguoi_dung(id,ho_ten) VALUES($1,$2) ON CONFLICT(id) DO NOTHING',[uid,'Khách '+uid.slice(0,6)]);await c.query('INSERT INTO public.lich_su_dang_nhap(nguoi_dung_id,ket_qua,dia_chi_ip,thiet_bi) VALUES($1,$2,$3,$4)',[uid,result,ip&&isIP(ip)?ip:null,String(device||'').slice(0,500)]);}finally{await c.end();}}catch{ /* Audit failure must not log credentials or interrupt authentication. */ }}

}
