import { ListModel } from "./iterator"

console.log("students, order by")
new ListModel("students").iterModel().Select("name", "surname")
	.Include("grades", g => g.Select("grade", "course_id"))
	.orderBy((left, right) => 1 - left.name.localeCompare(right.name))
	.forEach(v => console.log(v))

console.log("students, group by")
new ListModel("courses")
	.iterModel()
	.Select("name")
	.Include(
		"grades",
		g => g.Select("grade")
			.IncludeSingle(
				"students",
				v => v.Select("name")
			)
	).flatmap(v => {
		return v.grades
			.map(z => ({ ...z, course_name: v.name }))
	})
	.groupBy("course_name", "students")
	.forEach(
		(v, k) => {
			console.log("-----")
			console.log(k)
			v.forEach(console.log)
		}
	)

console.log("courses")
new ListModel("courses")
	.iterModel()
	.Select("name")
	.Include(
		"grades",
		g => g.Map(x => x.grade)
	)
	.forEach(console.log)