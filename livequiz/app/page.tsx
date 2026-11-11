   "use client";
   import { useEffect, useState } from "react";
   import { supabase } from "../lib/supabase";

   export default function Home() {
     const [status, setStatus] = useState("Menguji koneksi...");

     useEffect(() => {
       supabase
         .from("sessions")
         .select("id")
         .then(({ data, error }) => {
           if (error) setStatus("❌ Gagal terhubung: " + error.message);
           else setStatus(`✅ Terhubung ke Supabase (${data.length} sesi)`);
         });
     }, []);

     return (
       <main style={{ padding: 40 }}>
         <h1>LiveQuiz</h1>
         <p>{status}</p>
       </main>
     );
   }