import { ListModel } from "./iterator"

const students = new ListModel("students").iterModel()
const courses = new ListModel("courses").iterModel()
const grades = new ListModel("grades").iterModel()


students.Select("name", "surname")
	.Where(s => s.id == 3)
	.Include("grades", g => g.Select("grade", "course_id"))
	.forEach(v => v)
courses.Select("name").Include("grades", g => g.Map(x => x.grade)).forEach(console.log)