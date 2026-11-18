import {describe,it,expect,vi} from 'vitest';
import {ChatbotDeXuatService} from './de-xuat.service.js';
import {answerGemini} from './gemini.js';
describe('Suy nghĩ sâu và kiểm duyệt',()=>{
 it('chặn mọi thao tác đề xuất/chấp thuận của người không có quyền trước khi đọc DB',async()=>{const conn={db:vi.fn()},admin={kiemTraQuanTri:vi.fn().mockRejectedValue(new Error('Cấm'))},service=new ChatbotDeXuatService(conn as never,admin as never);await expect(service.generate('guest',{})).rejects.toThrow('Cấm');await expect(service.approve('guest',{})).rejects.toThrow('Cấm');expect(conn.db).not.toHaveBeenCalled();});
 it('dùng đúng tham số suy nghĩ của 2.5 và 3.5, không xuất phần suy nghĩ nội bộ',async()=>{
  const old=process.env.GEMINI_MODEL;
  try{for(const model of ['gemini-2.5-flash','gemini-3.5-flash-lite']){
    process.env.GEMINI_MODEL=model;let round=0;const request=vi.fn(async(_u:unknown,init:RequestInit|undefined)=>{const body=JSON.parse(String(init?.body));expect(body.generationConfig.maxOutputTokens).toBe(4096);expect(body.generationConfig.thinkingConfig).toEqual(model.startsWith('gemini-2.5')?{thinkingBudget:1024}:{thinkingLevel:'MEDIUM'});return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{role:'model',parts:round++===0?[{functionCall:{name:'doc_tai_lieu',args:{}}}]:[{thought:true,text:'Suy nghĩ riêng'},{text:'Bản nháp có nguồn'}]}}]}));});
    const result=await answerGemini({key:'mock',deep:true,system:'test',history:[{role:'user',parts:[{text:'Hỏi'}]}],tools:[{name:'doc_tai_lieu',description:'test',parameters:{type:'OBJECT',properties:{}}}],run:async()=>({noi_dung:'Nguồn được phép'}),request:request as typeof fetch});expect(result.text).toBe('Bản nháp có nguồn');
  }}finally{if(old===undefined)delete process.env.GEMINI_MODEL;else process.env.GEMINI_MODEL=old;}
 });
});
