import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExalumnosList } from './exalumnos-list';

describe('ExalumnosList', () => {
  let component: ExalumnosList;
  let fixture: ComponentFixture<ExalumnosList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExalumnosList],
    }).compileComponents();

    fixture = TestBed.createComponent(ExalumnosList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
