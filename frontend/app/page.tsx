"use client";

import { useMemo, useState } from "react";

type AnalyzeResult = {
  filename: string;
  image_width: number;
  image_height: number;
  detected_lines: number;
  meter_per_pixel: number;
  walls_length: number;
  columns: number;
  cement_ton: number;
  steel_ton: number;
  overlay_image: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [loading, setLoading] = useState(false);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  const isPdf = file?.type === "application/pdf";

  const handleAnalyze = async () => {
    if (!file) {
      alert("Chọn file trước");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      setResult(null);

      const response = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("API response failed");
      }

      const data: AnalyzeResult = await response.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      alert("Lỗi gọi API");
    } finally {
      setLoading(false);
    }
    
  };
  

  return (
    
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Blueprint Material Estimator
        </h1>
        <p className="mb-6 text-gray-600">
          Upload bản vẽ để phân tích sơ bộ vật liệu xây dựng.
        </p>
        

        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5">
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.pdf"
            onChange={(e) => {
              const selectedFile = e.target.files?.[0] || null;
              setFile(selectedFile);
              setResult(null);
            }}
            className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white hover:file:bg-blue-700"
          />

          {file && (
            <p className="mt-3 text-sm text-gray-600">
              File đã chọn: <span className="font-medium">{file.name}</span>
            </p>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading || !file}
            className="mt-4 rounded-xl bg-blue-600 px-5 py-3 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Analyzing..." : "Analyze Blueprint"}
          </button>

          {loading && (
            <p className="mt-3 text-sm text-gray-600">
              Analyzing blueprint with AI...
            </p>
          )}
        </div>

        {previewUrl && (
          <div className="mt-8">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">
              Preview bản vẽ
            </h2>

            <div className="overflow-hidden rounded-xl border bg-white p-3">
              {isPdf ? (
                <iframe
                  src={previewUrl}
                  title="Blueprint PDF Preview"
                  className="h-[500px] w-full rounded-lg"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Blueprint preview"
                  className="max-h-[500px] w-full rounded-lg object-contain"
                />
              )}
            </div>
          </div>
        )}

        
        {result && (
          <div className="mt-8 rounded-xl border bg-gray-50 p-5">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Kết quả phân tích
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-500">Tên file</p>
                <p className="font-semibold text-gray-900">{result.filename}</p>
              </div>

              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-500">Tổng chiều dài tường</p>
                <p className="font-semibold text-gray-900">
                  {result.walls_length} m
                </p>
              </div>

              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-500">Số cột</p>
                <p className="font-semibold text-gray-900">
                  {result.columns}
                </p>
              </div>

              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-500">Xi măng</p>
                <p className="font-semibold text-gray-900">
                  {result.cement_ton} tấn
                </p>
              </div>

              <div className="rounded-lg bg-white p-4 shadow-sm sm:col-span-2">
                <p className="text-sm text-gray-500">Thép</p>
                <p className="font-semibold text-gray-900">
                  {result.steel_ton} tấn
                </p>

                <p className="font-semibold text-gray-900">
                  {result.image_width} x {result.image_height} px
                </p>
                  {result?.overlay_image && (
                    <div className="mt-8">
                      <h2 className="mb-3 text-xl font-semibold text-gray-900">
                        Ảnh sau khi phân tích
                      </h2>
                      <div className="overflow-hidden rounded-xl border bg-white p-3">
                        <img
                          src={`data:image/png;base64,${result.overlay_image}`}
                          alt="Analyzed blueprint"
                          className="max-h-[500px] w-full rounded-lg object-contain"
                        />
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg bg-white p-4 shadow-sm">
                    <p className="text-sm text-gray-500">Số line phát hiện</p>
                    <p className="font-semibold text-gray-900">{result.detected_lines}</p>
                  </div>

                  <div className="rounded-lg bg-white p-4 shadow-sm">
                    <p className="text-sm text-gray-500">Tỷ lệ quy đổi</p>
                    <p className="font-semibold text-gray-900">
                      1 px ≈ {result.meter_per_pixel} m
                    </p>
                  </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
    </main>
  );
}