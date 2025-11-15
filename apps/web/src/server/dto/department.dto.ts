/**
 * Data Transfer Objects for Department operations
 */

export interface DepartmentDto {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  parentDepartmentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDepartmentDto {
  organizationId: string;
  name: string;
  description?: string | null;
  parentDepartmentId?: string | null;
}

export interface UpdateDepartmentDto {
  name?: string;
  description?: string | null;
  parentDepartmentId?: string | null;
}

export interface DepartmentWithChildrenDto extends DepartmentDto {
  children?: DepartmentDto[];
}

