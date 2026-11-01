import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

if (!process.env.GEMINI_API_KEY) {
    console.error('API KEY GEMINI BELUM DIISI!');
    process.exit(1);
}

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mengecek apakah server aktif
app.get('/api/health', (req, res) => {
    res.json({
        status: 'success',
        message: 'Triva AI server aktif'
    });
});

// API chatbot
app.post('/api/chat', async (req, res) => {
    console.log('Pesan diterima dari pengguna...');

    try {
        const { conversation } = req.body;

        if (!Array.isArray(conversation) || conversation.length === 0) {
            return res.status(400).json({
                error: 'Pesan tidak boleh kosong.'
            });
        }

        const contents = conversation.slice(-20).map(({ role, text }) => {
            if (!['user', 'model'].includes(role) || typeof text !== 'string') {
                throw new Error('Format percakapan tidak valid.');
            }

            return {
                role,
                parts: [{ text }]
            };
        });

        console.log('Menghubungi Gemini...');
        console.log('Model:', MODEL);

        const aiRequest = ai.models.generateContent({
            model: MODEL,
            contents,
            config: {
                systemInstruction: `
                    Kamu adalah Triva, asisten perjalanan wisata
                    yang ramah dan berpengalaman.

                    Gunakan bahasa Indonesia yang santai,
                    sopan, jelas, dan gunakan emoji secukupnya.

                    Bantu pengguna:
                    1. Mencari rekomendasi tempat wisata.
                    2. Membuat itinerary perjalanan.
                    3. Menghitung estimasi anggaran.
                    4. Memberikan tips liburan.
                    5. Merekomendasikan destinasi wisata.

                    Jika informasi kurang, tanyakan tujuan,
                    durasi liburan, jumlah orang, dan budget.

                    Jika pertanyaan di luar topik travel,
                    tolak dengan sopan.

                    Jangan mengarang harga atau jadwal terkini.
                `,
                temperature: 0.7,
                maxOutputTokens: 1200
            }
        });

        // Batas waktu agar server tidak menunggu selamanya
        const timeout = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('Waktu tunggu Gemini habis. Periksa koneksi atau API.'));
            }, 45000);
        });

        const response = await Promise.race([aiRequest, timeout]);

        console.log('Jawaban Gemini berhasil diterima!');

        return res.status(200).json({
            result: response.text || 'Maaf, Gemini tidak memberikan jawaban.'
        });

    } catch (error) {
        console.error('GEMINI ERROR:', error);

        return res.status(500).json({
            error: error.message || 'Terjadi kesalahan pada server.'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Triva AI berjalan di http://localhost:${PORT}`);
});