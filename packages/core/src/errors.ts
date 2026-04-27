export class DcklError extends Error {
  public readonly code: string;
  public readonly hint: string | undefined;

  constructor(code: string, message: string, hint?: string) {
    super(message);
    this.name = "DcklError";
    this.code = code;
    this.hint = hint;
  }
}

export class AuthError extends DcklError {
  constructor(message: string, hint?: string) {
    super("AUTH_FAILED", message, hint);
    this.name = "AuthError";
  }
}

export class RepoNotFoundError extends DcklError {
  constructor(message: string, hint?: string) {
    super("REPO_NOT_FOUND", message, hint);
    this.name = "RepoNotFoundError";
  }
}

export class ConcurrentModificationError extends DcklError {
  constructor(message: string, hint?: string) {
    super("CONCURRENT_MODIFICATION", message, hint);
    this.name = "ConcurrentModificationError";
  }
}

export class BodySchemaError extends DcklError {
  constructor(message: string, hint?: string) {
    super("BODY_SCHEMA_INVALID", message, hint);
    this.name = "BodySchemaError";
  }
}
