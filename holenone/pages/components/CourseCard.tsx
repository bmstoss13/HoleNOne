import Link from "next/link";
interface Props { course: any; distance?: number; }

export default function CourseCard({ course, distance }: Props) {
  return (
    <div className="course-card">
      <h3>{course.name}</h3>
      {distance && <small>{distance.toFixed(1)} mi</small>}
      <p>{course.city}, {course.state}</p>
      <Link href={`/course/${course.id}`}><button>View Tee Times</button></Link>
    </div>
  );
}
