type course = { name: string, id: number }
type student = { name: string, course: number }

type data_container = { "courses": course, "students": student }

type test<T extends keyof data_container & string, E extends data_container[T]> = Map<T, E>;


const data = {
	"courses": [{ name: "awesome", id: 2 }],
	"students": [{ name: "ryan", course: 2 }]
}

type joined<Left extends keyof data_container, Right extends keyof data_container> = {
	left: keyof data_container[Left],
	right: keyof data_container[Right]
}

const test: joined<"courses", "students"> = {
	left: "id",
	right: "course"
}



class ListModel<T extends keyof data_container, E extends data_container[T]> {
	reference: Array<E>
	at: number;
	constructor(name: T) {
		this.reference = data[name] as [E]
		this.at = 0;
	}
	next = () => {
		let val = this.reference[this.at];
		this.at += 1;
		return val;
	};
	iter = () => new Iterator2(this.next)

}

class List<T> {
	value: [T];
	at: number;
	constructor(value: [T]) {
		this.value = value;
		this.at = 0;
	}
	next = () => {
		let val = this.value[this.at];
		this.at += 1;
		return val;
	};
	iter = () => new Iterator2(this.next)

}


class Iterator2<T> {
	value: () => T | null;

	constructor(val: () => T | null) {
		this.value = val;
	}

	next = () => this.value();

	map = <T2>(func: (_: T) => T2) =>
		new Iterator2(() => {
			let obj = this.next();
			if (obj == undefined) {
				return undefined;
			}
			return func(obj);
		});

	filter = (func: (_: T) => boolean) =>
		new Iterator2(() => {
			while (true) {
				const val = this.next();
				if (val == undefined || func(val)) {
					return val;
				}
			}
		});

	find = (func: (_: T) => boolean) => {
		while (true) {
			const obj = this.next();
			if (obj == undefined) {
				return undefined;
			}
			if (func(obj)) {
				return obj;
			}
		}
	};
	inspect = (func: (_: T) => void) =>
		new Iterator2(() => {
			let obj = this.next();
			if (obj == undefined) {
				return undefined;
			} else {
				func(obj);
				return obj;
			}
		});
	forEach = (func: (_: T) => void) => {
		while (true) {
			const next = this.next();
			if (next) {
				func(next);
			} else {
				break;
			}
		}
	};
	Select = <C2 extends keyof T>(
		...c: Array<C2>
	): Iterator2<Pick<T, typeof c[number]>> => new Iterator2(this.next);

    /*
    GroupBy = <C2 extends keyof T>(
        ...c: Array<C2>
    ): Iterator2<{ key: Pick<T, typeof c[number]>; value: List<T> }> => {
        const items: Array<{
            key: Pick<T, typeof c[number]>;
            value: Array<T>;
        }> = [];
        while (true) {
            const obj = this.next();
            if (obj == undefined) {
                return new List(
                    items.map(v => ({ key: v.key, value: new List(v.value) }))
                ).iter();
            }
            const index = items.findIndex(v =>
                c.every(key => obj[key] == v.key[key])
            );
            if (index == -1) {
                items.push({ key: obj, value: [obj] });
            } else {
                items[index].value.push(obj);
            }
        }
    };*/
}

new ListModel("courses").iter().forEach(console.debug)

/*
new List([
    { userId: 1, listId: 1, name: "string1" },
    { userId: 1, listId: 2, name: "string2" },
    { userId: 2, listId: 2, name: "string3" },
    { userId: 1, listId: 1, name: "string4" },
    { userId: 1, listId: 2, name: "string5" },
    { userId: 2, listId: 2, name: "string6" },
])
    .iter()
    .GroupBy("userId", "listId")
    .map((v) => ({
        nice: "awesome",
        listId: v.key.listId,
        val: v.value
    }))
    .Select("nice")
    .forEach((v) => {
        console.log(v.nice)
    })
*/