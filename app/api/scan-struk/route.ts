import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/utils/supabase'; // Pastikan path ini sesuai dengan utilitas Supabase Server Anda

export async function POST(req: NextRequest) {
  try {
    // ==========================================
    // PENGAMANAN RUTE C: CEK SESI LOGIN DARI TOKEN
    // ==========================================
    // 1. Ambil token yang dikirim dari frontend
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: "Akses ditolak. Kunci akses tidak ditemukan." }, { status: 401 });
    }

    // 2. Verifikasi token tersebut ke Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Akses Ditolak: Token tidak valid.");
      return NextResponse.json({ error: "Akses ditolak. Sesi Anda tidak valid." }, { status: 401 });
    }
    // ==========================================

    const apiKey = process.env.GEMINI_API_KEY;

    // Terima data sebagai form-data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    // Konversi file ke Base64
    const buffer = await file.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString("base64");
    const mimeType = file.type;

    const genAI = new GoogleGenerativeAI(apiKey!);
    const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });

const prompt = `
      Analisis foto struk belanja/transaksi ini secara teliti.
      Ekstrak 6 informasi utama berikut:
      1. nama_toko: Tempat Anda melakukan transaksi (misal: Tokopedia, Indomaret).
      2. tanggal: Tanggal transaksi dengan format "YYYY-MM-DD" (contoh: "2026-10-25").
      3. nominal: Total Jumlah uang akhir yang dibayarkan (termasuk pajak/tip), HANYA ANGKA tanpa titik/koma/Rp.
      4. metode_pembayaran: Tunai, Kartu Kredit, Kartu Debit, QRIS, atau E-Wallet.
      5. rincian_barang: Daftar nama produk, qty, dan harga per satuan.
      6. kategori: Pilih SATU dari: "Makanan", "Transportasi", "Tagihan", "Hiburan", "Belanja", "Lainnya".

      Kembalikan HANYA format JSON murni tanpa tanda markdown (\`\`\`json), persis dengan struktur ini:
      {
        "nama_toko": "Indomaret",
        "tanggal": "2026-10-25",
        "nominal": 50000,
        "metode_pembayaran": "QRIS",
        "rincian_barang": [
          {"nama": "Roti Sisir", "qty": 1, "harga": 15000}
        ],
        "kategori": "Makanan"
      }
    `;
    
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: mimeType } }
    ]);

    const responseText = await result.response.text();
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanedText);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || "Gagal memproses gambar" }, { status: 500 });
  }
}