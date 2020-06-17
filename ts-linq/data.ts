export type course = { name: string, id: number }
export type student = { id: number, name: string, surname: string }
export type courseStudent = { student_id: number, course_id: number }
export type grade = { id: number, course_id: number, student_id: number, grade: number, is_homomorphic?: string }

export type Option<T> = { kind: "some", value: T } | { kind: "none" }

export const some = <T>(val: T): { kind: "some", value: T } => ({ kind: "some", value: val })
export const none = (): { kind: "none" } => ({ kind: "none" })

//the type of the object that contains all the data.
//needed because we need to use type magic using both the type and the object
export type data_container = { "courses": course, "students": student, "courseStudent": courseStudent, "grades": grade }


const courses: course[] = [{ name: "Software Engineering", id: 2 }, { name: "Analyse", id: 3 }, { name: "SLC", id: 1 }]
const students: student[] = [{ name: "Ryan", surname: "Graute", id: 1 }, { name: "Casper", surname: "de Keizer", id: 2 }, { name: "Tim", surname: "Dallau", id: 3 }]
const courseStudent: courseStudent[] = [{ student_id: 2, course_id: 2 }, { student_id: 3, course_id: 1 }, { student_id: 1, course_id: 3 }, { student_id: 3, course_id: 2 }]
const grades: grade[] = [{ id: 1, course_id: 2, student_id: 3, grade: 8 }]

//this object holds all the data.
export const data = {
	"courses": courses,
	"students": students,
	"courseStudent": courseStudent,
	"grades": grades
}

//the next 2 types make sure that the object containing the table references only contain tables and fields that are written correctly
export type joined<Left extends keyof data_container, Right extends keyof data_container> = {
	left: keyof data_container[Left],
	right: keyof data_container[Right]
}

export type Joins = {
	[v in keyof Partial<data_container>]: {
		[x in keyof Partial<data_container>]: joined<x, v>
	}
}
//this type is what actually binds the tables together
export type JoinTable = {
	"students": {
		"courseStudent": { left: "student_id", right: "id" },
		"grades": { left: "student_id", right: "id" }
	},
	"courseStudent": { "students": { left: "id", right: "student_id" } },
	"grades": { "students": { left: "id", right: "student_id" } },
	"courses": {
		"courseStudent": { left: "course_id", right: "id" },
		"grades": { left: "course_id", right: "id" }
	},
}
//the same as the above type. However, you can't get as much information out of a type as out of an object
//nor can you use an object as a type. So, we need both variants.
export const joins: JoinTable & Joins = {
	"students": {
		"courseStudent": { left: "student_id", right: "id" },
		"grades": { left: "student_id", right: "id" }
	},
	"courseStudent": {
		"students": { left: "id", right: "student_id" }
	},
	"grades": { "students": { left: "id", right: "student_id" } },
	"courses": {
		"courseStudent": { left: "course_id", right: "id" },
		"grades": { left: "course_id", right: "id" }
	}
}