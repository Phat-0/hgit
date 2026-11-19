try {
 const {createClient}=await import('@supabase/supabase-js');
 if(typeof createClient!=='function')throw Error('Thieu createClient');
 console.log('Đạt: Supabase và các thư viện ESM tải được.');
}catch(error){
 console.error('Thư viện máy chủ thiếu hoặc hỏng:',error.code||error.name);
 console.error('Dừng server, chạy npm ci --ignore-scripts trong may-chu rồi chạy lại.');
 process.exitCode=1;
}
