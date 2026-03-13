import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import diseaseClasses from "@/data/plant_disease_classes.json";
import Footer from "@/components/Footer";

interface PredictionResult {
  disease: string;
  displayName: string;
  confidence: number;
  description: string;
  treatment?: string;
}

interface DiseaseInfo {
  disease_name: string;
  description: string;
  treatement: string;
}

const getDiseaseDisplayName = (rawName: string) => {
  if (!rawName) return "Unknown";

  const normalized = rawName.trim();
  const parts = normalized.split("_");
  const diseaseParts = parts.length > 1 ? parts.slice(1) : parts;
  const base = diseaseParts.join(" ");

  // Normalize spacing and punctuation
  const spaced = base
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*\(\s*/g, " (")
    .replace(/\s*\)\s*/g, ")")
    .trim();

  return spaced
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const LeafDiseaseDetection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [leafSpecies, setLeafSpecies] = useState<{ species: string; confidence: number } | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      toast({
        title: "Invalid File",
        description: "Please upload an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size too large. Maximum 10MB allowed.");
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);
    setError(null);

    // Preview the image
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      setError("Please select an image first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", imageFile);

      const [diseaseResult, leafResult] = await Promise.allSettled([
        axios.post(
          `${import.meta.env.VITE_BACKEND}/predict-disease`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        ),
        axios.post(
          `${import.meta.env.VITE_BACKEND}/predict-leaf`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        ),
      ]);

      if (leafResult.status === "fulfilled") {
        setLeafSpecies({
          species: leafResult.value.data.species || "",
          confidence: leafResult.value.data.confidence ?? 0,
        });
      } else {
        console.warn("Leaf species prediction failed", leafResult.reason);
        setLeafSpecies(null);
      }

      if (diseaseResult.status !== "fulfilled") {
        // If disease prediction failed, throw to be caught below and show error
        throw diseaseResult.reason;
      }

      const res = diseaseResult.value;
      // Get disease name from backend
      const predictedDisease = res.data.disease || res.data.prediction || res.data.class;

      // Map disease info from JSON file
      const diseaseInfo = (diseaseClasses as DiseaseInfo[]).find(
        (d) => d.disease_name === predictedDisease
      );

      setPrediction({
        disease: predictedDisease,
        displayName: getDiseaseDisplayName(predictedDisease),
        confidence: res.data.confidence || (res.data.probability * 100),
        description: diseaseInfo?.description || "",
        treatment: diseaseInfo?.treatement || "",
      });

      setShowResults(true);
      toast({
        title: "Analysis Complete",
        description: "Leaf disease prediction completed successfully",
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || "Failed to analyze image. Please try again.";
      setError(errorMessage);
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard")}
          className="text-primary-foreground hover:bg-primary-foreground/20"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold">Leaf Disease Detection</h1>
      </div>

      <div className="p-4 space-y-4">
        {!showResults ? (
          <>
            <p className="text-center text-muted-foreground">
              Upload a leaf image to detect diseases
            </p>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Upload Leaf Image</CardTitle>
              </CardHeader>
              <CardContent><form onSubmit={handleSubmit} className="space-y-6 h-full">
  <div className="flex w-full h-full gap-6">

    {/* Image Upload Area */}
    <div
      onClick={handleUploadClick}
      className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />

      <div className="space-y-2 h-80 flex flex-col items-center justify-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <Upload className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <p className="font-semibold text-gray-700">
          Click to upload or drag and drop
        </p>
        <p className="text-sm text-gray-500">
          PNG, JPG, GIF up to 10MB
        </p>
      </div>
    </div>

    {/* Image Preview */}
    {selectedImage && (
      <div className="w-full flex flex-col space-y-3">

        <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
          <img
            src={selectedImage}
            alt="Preview"
            className="aspect-auto max-w-full max-h-80 object-contain"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleUploadClick}
        >
          Change Image
        </Button>
      </div>
    )}

  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full py-6 text-lg"
                    size="lg"
                    disabled={loading || !selectedImage}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Analyze Leaf"
                    )}
                  </Button>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="space-y-4">
            {/* Results Display */}
            {prediction && (
              <>
                {leafSpecies && (
                  <Card className="border-none shadow-md bg-blue-50 border-l-4 border-l-blue-500">
                    <CardHeader>
                      <CardTitle className="text-blue-700">Leaf Species</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Species:</span> {leafSpecies.species}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {prediction.displayName.toLowerCase() === "healthy" ? (
                  <Card className="border-none shadow-md bg-green-50 border-l-4 border-l-green-500">
                    <CardHeader>
                      <CardTitle className="text-green-700 flex items-center gap-2">
                        <CheckCircle className="w-6 h-6" />
                        Healthy Leaf Detected
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="bg-white p-4 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Status: </span>
                          Your leaf appears to be healthy with no signs of disease.
                        </p>
                        {/* <p className="text-sm text-gray-600 mt-2">
                          <span className="font-semibold">Confidence: </span>
                          {(prediction.confidence * 100).toFixed(2)}%
                        </p> */}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-none shadow-md bg-red-100 border-l-4 border-l-red-500 p-3">
                    <CardContent className="space-y-4">
                      <div className="bg-white p-4 rounded-lg space-y-3">
                        <div>
                          <p className="font-semibold text-lg text-red-700">
                            {prediction.displayName}
                          </p>
                          {/* <p className="text-sm text-gray-600 mt-1">
                            <span className="font-semibold">Confidence: </span>
                            {(prediction.confidence * 100).toFixed(2)}%
                          </p> */}
                        </div>

                        {prediction.description && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700">
                              Description:
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {prediction.description}
                            </p>
                          </div>
                        )}

                        {prediction.treatment && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700">
                              Recommended Treatment:
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {prediction.treatment}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Image Preview in Results */}
                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle>Analyzed Image</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center" style={{ maxHeight: "300px" }}>
                      <img
                        src={selectedImage || ""}
                        alt="Analyzed"
                        className="max-w-full max-h-80 object-contain"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    onClick={() => {
                      setShowResults(false);
                      setSelectedImage(null);
                      setImageFile(null);
                      setPrediction(null);
                      setLeafSpecies(null);
                      setError(null);
                    }}
                    className="w-full"
                  >
                    Analyze Another Leaf
                  </Button>
                  <Button
                    onClick={() => navigate("/dashboard")}
                    variant="outline"
                    className="w-full"
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <Footer currentPage="/leaf-disease-detection" />
    </div>
  );
};

export default LeafDiseaseDetection;
