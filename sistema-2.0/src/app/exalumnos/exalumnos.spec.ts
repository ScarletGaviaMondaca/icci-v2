import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Exalumnos } from './exalumnos';

describe('Exalumnos', () => {
  let component: Exalumnos;
  let fixture: ComponentFixture<Exalumnos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Exalumnos],
    }).compileComponents();

    fixture = TestBed.createComponent(Exalumnos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
