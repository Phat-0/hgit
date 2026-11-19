import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:homestay_app/dung_chung/api.dart';

void main() {
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
  test('Không biến lỗi phòng hết chỗ thành đơn thành công', () async {
    final api = Api(client: MockClient((_) async => http.Response(jsonEncode({'message': 'Phòng vừa được đặt'}), 409)), base: 'https://example.test/api');
    await expectLater(api.request('/bao-gia', body: {}), throwsA(isA<Exception>().having((e) => '$e', 'message', contains('Phòng vừa được đặt'))));
    api.close();
  });
}
