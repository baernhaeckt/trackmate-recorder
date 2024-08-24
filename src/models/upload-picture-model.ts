
export interface UploadPictureModel {
  trackNodeId: string | undefined,
  imageDataBase64: string,
  imageData: ImageData | undefined,
  mimeType: string
}