import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { departments, type Department, type NewDepartment } from "../db/schema";

/**
 * Database queries for Department operations
 * Pure data access layer - no business logic
 */
export class DepartmentQueries {
  /**
   * Create a new department
   */
  static async insertDepartment(
    data: NewDepartment
  ): Promise<Department> {
    const [department] = await db
      .insert(departments)
      .values({
        ...data,
        updatedAt: new Date(),
      })
      .returning();

    return department;
  }

  /**
   * Get all departments for an organization
   */
  static async selectDepartmentsByOrganization(
    organizationId: string
  ): Promise<Department[]> {
    return await db
      .select()
      .from(departments)
      .where(eq(departments.organizationId, organizationId))
      .orderBy(departments.name);
  }

  /**
   * Get a department by ID
   */
  static async selectDepartmentById(id: string): Promise<Department | null> {
    const [department] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);

    return department ?? null;
  }

  /**
   * Get child departments for a parent department
   */
  static async selectChildDepartments(
    parentDepartmentId: string
  ): Promise<Department[]> {
    return await db
      .select()
      .from(departments)
      .where(eq(departments.parentDepartmentId, parentDepartmentId))
      .orderBy(departments.name);
  }

  /**
   * Get top-level departments (no parent)
   */
  static async selectTopLevelDepartments(
    organizationId: string
  ): Promise<Department[]> {
    return await db
      .select()
      .from(departments)
      .where(
        and(
          eq(departments.organizationId, organizationId),
          isNull(departments.parentDepartmentId)
        )
      )
      .orderBy(departments.name);
  }

  /**
   * Update a department
   */
  static async updateDepartment(
    id: string,
    data: Partial<Omit<NewDepartment, "id" | "organizationId" | "createdAt">>
  ): Promise<Department> {
    const [department] = await db
      .update(departments)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(departments.id, id))
      .returning();

    return department;
  }

  /**
   * Delete a department
   */
  static async deleteDepartment(id: string): Promise<void> {
    await db.delete(departments).where(eq(departments.id, id));
  }
}

