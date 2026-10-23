import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const { imageBase64 } = await req.json();

        const mimeTypeMatch = imageBase64.match(/^data:(image\/[a-zA-Z]+);base64,/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
        const base64Data = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

        const genAI = new GoogleGenerativeAI(apiKey!);
        const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });

        // REVISI INSTRUKSI: Fokus ketat pada 5 informasi wajib
        const prompt = `
      Analisis foto struk belanja/transaksi ini secara teliti.
      Ekstrak 5 informasi utama berikut:
      1. Nama Toko / Merchant (Di mana transaksi terjadi, misal: Tokopedia, Indomaret, SPBU).
      2. Tanggal dan Waktu (Format: "DD/MM/YYYY HH:mm", contoh: "23/10/2026 14:30". Jika waktu tidak ada, tulis tanggalnya saja).
      3. Total Nominal / Grand Total (Jumlah uang akhir yang dibayarkan, hanya angka tanpa titik/koma/Rp).
      4. Rincian Barang/Jasa (Daftar nama produk, kuantitas/qty, dan harga per satuan).
      5. Metode Pembayaran (Misal: Tunai, Kartu Debit, Kartu Kredit, QRIS, E-wallet. Jika tidak tertulis di struk, isi dengan "Tidak diketahui").

      Kembalikan HANYA format JSON murni tanpa tanda markdown (\`\`\`json), persis dengan struktur ini:
      {
        "nama_toko": "Indomaret",
        "tanggal_waktu": "23/10/2026 14:30",
        "total_nominal": 50000,
        "rincian_barang": [
          {"nama": "Roti Sisir", "qty": 1, "harga": 15000},
          {"nama": "Susu Kotak", "qty": 2, "harga": 10000}
        ],
        "metode_pembayaran": "QRIS"
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
        return NextResponse.json({ error: error.message || "Gagal memproses gambar" }, { status: 500 });
    }
}