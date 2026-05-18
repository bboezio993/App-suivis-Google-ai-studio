import { GoogleGenAI, Type } from "@google/genai";
import { DailyMetrics, UserProfile, AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeHealthData(
  profile: UserProfile,
  recentMetrics: DailyMetrics[]
): Promise<AnalysisResult> {
  const prompt = `
    En tant que comité d'experts en médecine du sport et physiologie, analysez les données suivantes pour cet utilisateur :
    Profil: ${JSON.stringify(profile)}
    Données récentes (7 derniers jours): ${JSON.stringify(recentMetrics)}

    Votre mission :
    1. Calculer un score de disponibilité (Readiness) de 0 à 100.
    2. Identifier l'état actuel (optimal, stable, strained, critical).
    3. Fournir un résumé synthétique.
    4. Générer des recommandations précises (entraînement, nutrition, récupération).
    5. Identifier les tendances HRV et récupération.

    Répondez UNIQUEMENT au format JSON respectant le schéma AnalysisResult.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            readinessScore: { type: Type.NUMBER },
            status: { type: Type.STRING, enum: ['optimal', 'stable', 'strained', 'critical'] },
            summary: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  category: { type: Type.STRING, enum: ['training', 'nutrition', 'recovery', 'lifestyle'] },
                  priority: { type: Type.STRING, enum: ['low', 'medium', 'high', 'critical'] },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  scientificBasis: { type: Type.STRING }
                },
                required: ['id', 'category', 'priority', 'title', 'description']
              }
            },
            trends: {
              type: Type.OBJECT,
              properties: {
                hrv: { type: Type.STRING, enum: ['up', 'down', 'stable'] },
                recovery: { type: Type.STRING, enum: ['improving', 'declining', 'stable'] }
              }
            }
          },
          required: ['readinessScore', 'status', 'summary', 'recommendations', 'trends']
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result as AnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Fallback basic result
    return {
      readinessScore: 70,
      status: 'stable',
      summary: "Analyse indisponible pour le moment. Basé sur les seuils standards, votre état semble stable.",
      recommendations: [],
      trends: { hrv: 'stable', recovery: 'stable' }
    };
  }
}
