import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:homestay_app/dung_chung/api.dart';

void main() {
  test('Khôi phục và xoay refresh token, xóa khi đăng xuất', () async {
    FlutterSecureStorage.setMockInitialValues({'homestay_refresh_token': 'refresh-before'});
    final api = Api(client: MockClient((request) async {
      expect(request.url.path, '/api/xac-thuc/lam-moi');
      expect(jsonDecode(request.body)['refresh_token'], 'refresh-before');
      return http.Response('{"access_token":"access-after","refresh_token":"refresh-after"}', 200);
    }));
    const storage = FlutterSecureStorage();
    await api.restoreSession();
    expect(api.token, 'access-after');
    expect(await storage.read(key: 'homestay_refresh_token'), 'refresh-after');
    api.token = null;
    await Future<void>.delayed(Duration.zero);
    expect(await storage.read(key: 'homestay_refresh_token'), isNull);
    api.close();
  });

  test('Gửi khóa chống lặp nguyên vẹn khi đặt phòng', () async {
    final client = MockClient((request) async {
      expect(request.url.path, '/api/khach/dat-phong');
      expect(request.headers['authorization'], 'Bearer access');
      expect(jsonDecode(request.body)['khoa_yeu_cau'], 'retry-key');
      return http.Response('{"ma_dat_phong":"DP01"}', 200);
    });
    final api = Api(client: client, base: 'https://example.test/api')..token = 'access';
    expect((await api.request('/dat-phong', body: {'khoa_yeu_cau': 'retry-key'}))['ma_dat_phong'], 'DP01');
    api.close();
  });
  for (final (payload, unavailable) in [
    ({'code': 'PHONG_KHONG_KHA_DUNG', 'message': 'Khung giờ không còn trống'}, true),
    ({'message': 'Phòng vừa được đặt. Hãy tìm lại lịch trống'}, true),
    ({'message': 'Voucher đã hết lượt'}, false),
  ]) {
    test('Phân loại HTTP 409: ${payload['message']}', () async {
      final api = Api(
        client: MockClient((_) async => http.Response.bytes(utf8.encode(jsonEncode(payload)), 409)),
        base: 'https://example.test/api',
      );
      addTearDown(api.close);
      await expectLater(
        api.request('/bao-gia', body: {}),
        throwsA(isA<ApiError>().having(
          (error) => error.phongKhongKhaDung,
          'phongKhongKhaDung',
          unavailable,
        )),
      );
    });
  }
}
