export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }

  static async fromResponse(res: Response): Promise<ApiError> {
    const text = await res.text().catch(() => res.statusText);
    return new ApiError(res.status, text);
  }
}
